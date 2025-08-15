"use server";

import util from "util";
import db, { historyDb, maniaDb, mapsDb, playersDb, taikoDb } from "@/app/api/db/connection";
import { batchArray, batchCursor } from "@/helpers/list-splitter";
import { getOsuToken } from "@/helpers/osuToken";
import { DbHistory } from "@/types/database.history";
import { UndocumentedBeatmappackCompact } from "@/types/undocumented.beatmappacks";
import { PolynomialRegressor } from "@rainij/polynomial-regression-js";
import { Beatmap, Beatmapset, Client, GameMode } from "osu-web.js";
import { AnyBeatmap, CatchBeatmap, DbBeatmap, ManiaBeatmap, OsuBeatmap } from "@/types/database.beatmap";
import { ModRatings, Rating, SimpleMod } from "@/types/rating";
import { matchResultValue, parseMpLobby } from "@/app/profile/[playerid]/pve/functions";
import { getMaplist } from "@/helpers/currentPack";
import { delay, seconds } from "@/time";
import { DbPlayer, ModeInfo, PvEMatchHistory } from "@/types/database.player";
import { Glicko2, Player } from "glicko2";
import { UpdateFilter } from "mongodb";
import { revalidatePath } from "next/cache";

async function getPreviousMapScalings(mode: GameMode) {
   console.log("Get previous map scalings");
   const adding = ["$ratings.nm.rd", "$ratings.dt.rd"];
   if (mode !== "mania") adding.push("$ratings.hd.rd", "$ratings.hr.rd");
   const maplist = mapsDb[mode].aggregate<AnyBeatmap & { rdSum: number }>([
      {
         $addFields: {
            rdSum: { $add: adding }
         }
      },
      { $match: { rdSum: { $lt: mode === "mania" ? 300 : 400 } } },
      { $sort: { rdSum: 1 } },
      { $limit: 1000 }
   ]);
   const datasets = { x: [] as number[][], y: [] as number[][] };
   const meta = { max: 1500 };
   for await (const map of maplist) {
      const { nm, hd, hr, dt } = map.ratings as ModRatings<SimpleMod>;
      // Update the max and min
      for (const rating of Object.values<Rating>(map.ratings)) {
         meta.max = Math.max(meta.max, rating.rating + rating.rd * 2);
      }
      const xData = [
         map.stars,
         map.length,
         map.bpm,
         map.cs,
         map.od,
         map.noteCount.circles,
         map.noteCount.sliders,
         map.maxCombo
      ];
      if (mode !== "mania") xData.push((map as OsuBeatmap | CatchBeatmap).ar);
      if (mode === "fruits") xData.push(+(map as CatchBeatmap).convert);
      datasets.x.push(xData);
      datasets.y.push([nm.rating, hd?.rating || 0, hr?.rating || 0, dt.rating]);
   }
   const polyReg: PolynomialRegressor & { meta?: { max: number } } = new PolynomialRegressor(1);
   polyReg.fit(datasets.x, datasets.y);
   polyReg.meta = meta;
   return polyReg;
}

const INIT_MAP_RD = 150;
const INIT_MAP_VOL = 0.06;
const RATING_MIN = 500;

function prepBeatmapData(
   osuBeatmap: Beatmap & {
      max_combo: number;
      beatmapset: Beatmapset;
   },
   predictor: PolynomialRegressor & { meta?: { max: number } }
): AnyBeatmap {
   const { max } = predictor.meta;
   const predictData = [
      osuBeatmap.difficulty_rating,
      osuBeatmap.total_length,
      osuBeatmap.bpm,
      osuBeatmap.cs,
      osuBeatmap.accuracy,
      osuBeatmap.count_circles,
      osuBeatmap.count_sliders,
      osuBeatmap.max_combo
   ];
   if (osuBeatmap.mode !== "mania") predictData.push(osuBeatmap.ar);
   if (osuBeatmap.mode === "fruits") predictData.push(+osuBeatmap.convert);
   const [[nm, hd, hr, dt]] = predictor.predict([predictData]);
   const ratingObj = (rating: number) => {
      if (rating > max) return { rating: max, rd: rating - max + INIT_MAP_RD, vol: INIT_MAP_VOL };
      else if (rating < RATING_MIN)
         return { rating: RATING_MIN, rd: RATING_MIN - rating + INIT_MAP_RD, vol: INIT_MAP_VOL };
      else return { rating, rd: INIT_MAP_RD, vol: INIT_MAP_VOL };
   };
   const mapData: DbBeatmap = {
      _id: osuBeatmap.id,
      setid: osuBeatmap.beatmapset_id,
      artist: osuBeatmap.beatmapset.artist,
      title: osuBeatmap.beatmapset.title,
      version: osuBeatmap.version,
      mapper: osuBeatmap.beatmapset.creator,
      stars: osuBeatmap.difficulty_rating,
      length: osuBeatmap.total_length,
      bpm: osuBeatmap.bpm,
      ar: osuBeatmap.ar,
      cs: osuBeatmap.cs,
      od: osuBeatmap.accuracy,
      maxCombo: osuBeatmap.max_combo,
      noteCount: {
         circles: osuBeatmap.count_circles,
         sliders: osuBeatmap.count_sliders
      }
   };
   // If the map is unranked, include dates to re-query later
   if (osuBeatmap.ranked < 1) {
      mapData.lastQuery = new Date();
      mapData.lastUpdate = new Date(osuBeatmap.last_updated);
   }
   if (osuBeatmap.mode === "mania") {
      const maniaData: ManiaBeatmap = {
         ...mapData,
         ratings: {
            nm: ratingObj(nm),
            dt: ratingObj(dt)
         }
      };
      return maniaData;
   } else if (osuBeatmap.mode === "fruits") {
      const fruitsData: CatchBeatmap = {
         ...mapData,
         ratings: {
            nm: ratingObj(nm),
            hd: ratingObj(hd),
            hr: ratingObj(hr),
            dt: ratingObj(dt)
         },
         convert: osuBeatmap.convert
      };
      return fruitsData;
   } else {
      const normalData: OsuBeatmap = {
         ...mapData,
         ratings: {
            nm: ratingObj(nm),
            hd: ratingObj(hd),
            hr: ratingObj(hr),
            dt: ratingObj(dt)
         }
      };
      return normalData;
   }
}

async function submitPve(mp: number) {
   const { matches, maps } = await parseMpLobby(mp);
   // Create the rating calculator
   const calculator = new Glicko2();
   const calculatorResults: [Player, Player, number][] = [];
   // Get each player's data
   const playerIds = Object.keys(matches).map(id => parseInt(id));
   const playerList: DbPlayer[] = await playersDb
      .find({
         osuid: { $in: playerIds }
      })
      .toArray();
   console.log(`Found ${playerList.length} of ${playerIds.length} players`);
   // Look up anyone we don't already have
   const missingPlayers = playerIds.filter(id => !playerList.find(p => p.osuid === id));
   if (missingPlayers.length > 0) {
      const client = new Client(await getOsuToken());
      const addingUsers: DbPlayer[] = [];
      let panic = false;
      for (const batch of batchArray(missingPlayers)) {
         console.log(`Get ${batch.length} players from bancho`);
         const banchoUsers = await client.users.getUsers({ query: { ids: batch } }).catch(err => {
            console.error(err);
            return { panic: true };
         });
         if ("panic" in banchoUsers) {
            panic = true;
            break;
         }

         const ratingSet: ModeInfo = {
            pve: {
               rating: 1500,
               rd: 350,
               vol: 0.06,
               matches: [],
               games: 0,
               songs: 0
            }
         };
         addingUsers.push(
            ...banchoUsers.map(bu => ({
               osuid: bu.id,
               osuname: bu.username,
               osu: ratingSet,
               fruits: ratingSet,
               taiko: ratingSet,
               mania: ratingSet
            }))
         );
         console.log(`Done! Now ${addingUsers.length} total`);
         if (!(addingUsers.length % 200)) {
            const n = addingUsers.length / 200;
            await delay(seconds(((n * (n + 1)) / 4) | 0));
         }
      }
      // Done looking everyone up, add to db
      if (addingUsers.length > 0) {
         const addPlayerResult = await playersDb.insertMany(addingUsers);
         console.log(addPlayerResult);
      }
      // Add to the player list
      playerList.push(...addingUsers);

      // Stop the function if we hit an error
      if (panic)
         return {
            http: {
               status: 500,
               message: "Failed to fetch player information"
            }
         };
   }

   const playerCalculatorPairs = playerList.map(dbp => {
      const playerCalc: Partial<Record<GameMode, Player>> = {};
      const history: Partial<Record<GameMode, PvEMatchHistory>> = {};
      return {
         playerId: dbp.osuid,
         dbplayer: dbp,
         playerCalc,
         history
      };
   });
   const maplist = await Promise.all(
      Object.keys(maps).map(async (mode: GameMode) =>
         (
            await getMaplist(mode, maps[mode].values().toArray())
         ).map(map => ({
            map,
            mode,
            ratings: {} as Partial<Record<SimpleMod, Player>>
         }))
      )
   ).then(modeArr => modeArr.flat());
   console.log(`Got ${maplist.length} maps`);

   // Create matches for all scores and prep the player's history
   Object.keys(matches).forEach(playerIdStr => {
      const playerId = parseInt(playerIdStr);
      const matchInfo = matches[playerId];
      const playerInfo = playerCalculatorPairs.find(pcp => pcp.playerId === playerId);
      // If there's no player info, we kind of need to just skip them. Situations can be investigated
      // on a case-by-case basis if people are noticing they're missing results.
      if (!playerInfo) return;
      matchInfo.forEach(score => {
         const mapInfo = maplist.find(m => m.map._id === score.map && m.mode === score.mode);
         // If the map isn't in the list, ignore it
         if (!mapInfo) return;
         // Set the map info on the parser
         score.score.setMap(mapInfo.map);
         // If parsing the score fails, also skip the map
         if (!score.score.getScore()) return;

         // Prep the player's history
         if (!(score.mode in playerInfo.history))
            playerInfo.history[score.mode] = {
               mp,
               prevRating: playerInfo.dbplayer[score.mode].pve.rating,
               ratingDiff: 0,
               songs: []
            };
         // Update the history
         playerInfo.history[score.mode].songs.push({
            map: {
               id: mapInfo.map._id,
               setid: mapInfo.map.setid,
               version: mapInfo.map.version
            },
            mod: score.mod,
            score: score.score.getScore()
         });

         // Create a glicko player for this gamemode if it doesn't already exist
         if (!(score.mode in playerInfo.playerCalc)) {
            const pveStats = playerInfo.dbplayer[score.mode].pve;
            playerInfo.playerCalc[score.mode] = calculator.makePlayer(
               pveStats.rating,
               pveStats.rd,
               pveStats.vol
            );
         }
         // Create a glicko player for the selected mod if it doesn't already exist
         if (!(score.mod in mapInfo.ratings)) {
            const mapStats = mapInfo.map.ratings[score.mod];
            mapInfo.ratings[score.mod] = calculator.makePlayer(mapStats.rating, mapStats.rd, mapStats.vol);
         }

         // Calculate the score result
         calculatorResults.push([
            playerInfo.playerCalc[score.mode],
            mapInfo.ratings[score.mod],
            matchResultValue(score.score.getScore(), score.mode)
         ]);
      });
   });

   // Update matches
   console.log(`Update results for ${calculatorResults.length} scores`);
   calculator.updateRatings(calculatorResults);

   // Save results to database
   const playersDbWriteResult = await playersDb.bulkWrite(
      playerCalculatorPairs
         .map(({ playerId, playerCalc, history }) => {
            const updateFilter: UpdateFilter<DbPlayer> = {
               $set: {},
               $inc: {},
               $push: {}
            };
            const playedModes = Object.keys(playerCalc) as GameMode[];
            if (playedModes.length < 1) return;
            for (const mode of playedModes) {
               const updatedRating = playerCalc[mode].getRating();
               history[mode].ratingDiff = updatedRating - history[mode].prevRating;
               updateFilter.$set[`${mode}.pve.rating`] = updatedRating;
               updateFilter.$set[`${mode}.pve.rd`] = playerCalc[mode].getRd();
               updateFilter.$set[`${mode}.pve.vol`] = playerCalc[mode].getVol();
               updateFilter.$inc[`${mode}.pve.games`] = 1;
               updateFilter.$inc[`${mode}.pve.songs`] = history[mode].songs.length;
               updateFilter.$push = {
                  ...updateFilter.$push,
                  [`${mode}.pve.matches`]: {
                     $each: [history[mode]],
                     $position: 0,
                     $slice: 5
                  }
               };
            }
            return {
               updateOne: {
                  filter: { osuid: playerId },
                  update: updateFilter
               }
            };
         })
         .filter(v => v)
   );
   console.log("Players", playersDbWriteResult);

   // Figure out which maps to update
   for (const mode of Object.keys(maps) as GameMode[]) {
      const filteredMaplist = maplist.filter(m => m.mode === mode);
      const modeDbWriteResult = await mapsDb[mode].bulkWrite(
         filteredMaplist
            .map(({ map, ratings }) => {
               const updateFilter: UpdateFilter<DbBeatmap> = {
                  $set: {}
               };
               const playedMods = Object.keys(ratings) as SimpleMod[];
               if (playedMods.length < 1) return;
               for (const mod of playedMods) {
                  const modRating = ratings[mod];
                  updateFilter.$set[`ratings.${mod}`] = {
                     rating: modRating.getRating(),
                     rd: modRating.getRd(),
                     vol: modRating.getVol()
                  };
               }
               return {
                  updateOne: {
                     filter: { _id: map._id },
                     update: updateFilter
                  }
               };
            })
            .filter(v => v)
      );
      console.log(`${mode} maps`, modeDbWriteResult);
   }

   revalidatePath("/profile");
}

export async function debug() {
   const mp = 118309125;
   const predictor = await getPreviousMapScalings("mania");
   const client = new Client(await getOsuToken());
   const { matches, maps } = await parseMpLobby(mp);
   for (const mapBatch of batchArray([...maps.mania])) {
      const maplist = await client.beatmaps.getBeatmaps({ query: { ids: mapBatch } });
      maplist.forEach(m => {
         if (m.mode !== "mania") return;
         const data = prepBeatmapData(m, predictor);
         console.log(
            `${data.stars}, ${data.ratings.nm.rating.toFixed()}, ${data.ratings.dt.rating.toFixed()}`
         );
      });
   }
}
