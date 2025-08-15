"use server";

import { historyDb, mapsDb, playersDb } from "@/app/api/db/connection";
import { Glicko2, Player } from "glicko2";
import { revalidatePath } from "next/cache";
import { matchResultValue, parseMpLobby, submitPveData } from "./functions";
import { withinRange } from "@/helpers/rating-range";
import { getCurrentPack, getMaplist } from "@/helpers/currentPack";
import { SimpleMod } from "@/types/rating";
import { DbPlayer, ModeInfo, PvEMatchHistory } from "@/types/database.player";
import { Client, GameMode } from "osu-web.js";
import { DbBeatmap } from "@/types/database.beatmap";
import { getOsuToken } from "@/helpers/osuToken";
import { UpdateFilter } from "mongodb";
import { batchArray } from "@/helpers/list-splitter";
import { delay, seconds } from "@/time";

export async function generateAttack(osuid: number, mapcount = 7) {
   const player = await playersDb.findOne({ osuid });
   const pveStats = player[player.gamemode]?.pve;
   console.log(`Target range: ${pveStats.rating.toFixed(1)} ±${pveStats.rd.toFixed(1)}`);
   const packMaps = await getCurrentPack(player.gamemode || "osu");
   let availableMaps = packMaps
      .flatMap(map =>
         Object.keys(map.ratings).map((mod: SimpleMod) => ({
            id: map._id,
            setid: map.setid,
            mod,
            rating: map.ratings[mod]
         }))
      )
      .filter(map => withinRange(pveStats, map.rating));
   console.log(`${availableMaps.length} available maps`);

   const selectedMaps = Array.from({ length: mapcount }, () => {
      if (availableMaps.length < 1) return;
      const index = (Math.random() * availableMaps.length) | 0;
      const selected = availableMaps[index];
      availableMaps = availableMaps.filter(m => m.setid !== selected.setid);
      return selected;
   }).filter(v => v);
   console.log(selectedMaps);

   return selectedMaps.map(m => `${m.id}+${m.mod.toUpperCase()}`);
}

export async function submitPve(formData: FormData) {
   const mpLink = formData.get("mp").toString();
   const matchIdSegment = parseInt(mpLink.slice(mpLink.lastIndexOf("/") + 1));
   if (await historyDb.findOne({ _id: "mpLinks", items: matchIdSegment }))
      return {
         http: {
            status: 400,
            message: "MP link already submitted"
         }
      };
   const data = await parseMpLobby(matchIdSegment);
   if (!data)
      return {
         http: {
            status: 400,
            message: "Please finish the lobby before submitting"
         }
      };
   if (Object.keys(data.matches).length < 1)
      return {
         http: {
            status: 400,
            message: "No songs found"
         }
      };
   // Add the mp link to history
   historyDb.updateOne({ _id: "mpLinks" }, { $push: { items: matchIdSegment } });
   console.log(data.matches);
   try {
      await submitPveData(data);
   } catch (err) {
      console.warn(err);
      return {
         http: {
            status: 500,
            message: "Failed to fetch player information"
         }
      };
   }
   // // Create the rating calculator
   // const calculator = new Glicko2();
   // const calculatorResults: [Player, Player, number][] = [];
   // // Get each player's data
   // const playerIds = Object.keys(matches).map(id => parseInt(id));
   // const playerList: DbPlayer[] = await playersDb
   //    .find({
   //       osuid: { $in: playerIds }
   //    })
   //    .toArray();
   // console.log(`Found ${playerList.length} of ${playerIds.length} players`);
   // // Look up anyone we don't already have
   // const missingPlayers = playerIds.filter(id => !playerList.find(p => p.osuid === id));
   // if (missingPlayers.length > 0) {
   //    const client = new Client(await getOsuToken());
   //    const addingUsers: DbPlayer[] = [];
   //    let panic = false;
   //    for (const batch of batchArray(missingPlayers)) {
   //       console.log(`Get ${batch.length} players from bancho`);
   //       const banchoUsers = await client.users.getUsers({ query: { ids: batch } }).catch(err => {
   //          console.error(err);
   //          return { panic: true };
   //       });
   //       if ("panic" in banchoUsers) {
   //          panic = true;
   //          break;
   //       }

   //       const ratingSet: ModeInfo = {
   //          pve: {
   //             rating: 1500,
   //             rd: 350,
   //             vol: 0.06,
   //             matches: [],
   //             games: 0,
   //             songs: 0
   //          }
   //       };
   //       addingUsers.push(
   //          ...banchoUsers.map(bu => ({
   //             osuid: bu.id,
   //             osuname: bu.username,
   //             osu: ratingSet,
   //             fruits: ratingSet,
   //             taiko: ratingSet,
   //             mania: ratingSet
   //          }))
   //       );
   //       console.log(`Done! Now ${addingUsers.length} total`);
   //       if (!(addingUsers.length % 200)) {
   //          const n = addingUsers.length / 200;
   //          await delay(seconds(((n * (n + 1)) / 4) | 0));
   //       }
   //    }
   //    // Done looking everyone up, add to db
   //    if (addingUsers.length > 0) {
   //       const addPlayerResult = await playersDb.insertMany(addingUsers);
   //       console.log(addPlayerResult);
   //    }
   //    // Add to the player list
   //    playerList.push(...addingUsers);

   //    // Stop the function if we hit an error
   //    if (panic)
   //       return {
   //          http: {
   //             status: 500,
   //             message: "Failed to fetch player information"
   //          }
   //       };
   // }

   // const playerCalculatorPairs = playerList.map(dbp => {
   //    const playerCalc: Partial<Record<GameMode, Player>> = {};
   //    const history: Partial<Record<GameMode, PvEMatchHistory>> = {};
   //    return {
   //       playerId: dbp.osuid,
   //       dbplayer: dbp,
   //       playerCalc,
   //       history
   //    };
   // });
   // const maplist = await Promise.all(
   //    Object.keys(maps).map(async (mode: GameMode) =>
   //       (
   //          await getMaplist(mode, maps[mode].values().toArray())
   //       ).map(map => ({
   //          map,
   //          mode,
   //          ratings: {} as Partial<Record<SimpleMod, Player>>
   //       }))
   //    )
   // ).then(modeArr => modeArr.flat());
   // console.log(`Got ${maplist.length} maps`);

   // // Create matches for all scores and prep the player's history
   // Object.keys(matches).forEach(playerIdStr => {
   //    const playerId = parseInt(playerIdStr);
   //    const matchInfo = matches[playerId];
   //    const playerInfo = playerCalculatorPairs.find(pcp => pcp.playerId === playerId);
   //    // If there's no player info, we kind of need to just skip them. Situations can be investigated
   //    // on a case-by-case basis if people are noticing they're missing results.
   //    if (!playerInfo) return;
   //    matchInfo.forEach(score => {
   //       const mapInfo = maplist.find(m => m.map._id === score.map && m.mode === score.mode);
   //       // If the map isn't in the list, ignore it
   //       if (!mapInfo) return;
   //       // Set the map info on the parser
   //       score.score.setMap(mapInfo.map);
   //       // If parsing the score fails, also skip the map
   //       if (!score.score.getScore()) return;

   //       // Prep the player's history
   //       if (!(score.mode in playerInfo.history))
   //          playerInfo.history[score.mode] = {
   //             mp: matchIdSegment,
   //             prevRating: playerInfo.dbplayer[score.mode].pve.rating,
   //             ratingDiff: 0,
   //             songs: []
   //          };
   //       // Update the history
   //       playerInfo.history[score.mode].songs.push({
   //          map: {
   //             id: mapInfo.map._id,
   //             setid: mapInfo.map.setid,
   //             version: mapInfo.map.version
   //          },
   //          mod: score.mod,
   //          score: score.score.getScore()
   //       });

   //       // Create a glicko player for this gamemode if it doesn't already exist
   //       if (!(score.mode in playerInfo.playerCalc)) {
   //          const pveStats = playerInfo.dbplayer[score.mode].pve;
   //          playerInfo.playerCalc[score.mode] = calculator.makePlayer(
   //             pveStats.rating,
   //             pveStats.rd,
   //             pveStats.vol
   //          );
   //       }
   //       // Create a glicko player for the selected mod if it doesn't already exist
   //       if (!(score.mod in mapInfo.ratings)) {
   //          const mapStats = mapInfo.map.ratings[score.mod];
   //          mapInfo.ratings[score.mod] = calculator.makePlayer(mapStats.rating, mapStats.rd, mapStats.vol);
   //       }

   //       // Calculate the score result
   //       calculatorResults.push([
   //          playerInfo.playerCalc[score.mode],
   //          mapInfo.ratings[score.mod],
   //          matchResultValue(score.score.getScore(), score.mode)
   //       ]);
   //    });
   // });

   // // Update matches
   // console.log(`Update results for ${calculatorResults.length} scores`);
   // calculator.updateRatings(calculatorResults);

   // // Save results to database
   // const playersDbWriteResult = await playersDb.bulkWrite(
   //    playerCalculatorPairs
   //       .map(({ playerId, playerCalc, history }) => {
   //          const updateFilter: UpdateFilter<DbPlayer> = {
   //             $set: {},
   //             $inc: {},
   //             $push: {}
   //          };
   //          const playedModes = Object.keys(playerCalc) as GameMode[];
   //          if (playedModes.length < 1) return;
   //          for (const mode of playedModes) {
   //             const updatedRating = playerCalc[mode].getRating();
   //             history[mode].ratingDiff = updatedRating - history[mode].prevRating;
   //             updateFilter.$set[`${mode}.pve.rating`] = updatedRating;
   //             updateFilter.$set[`${mode}.pve.rd`] = playerCalc[mode].getRd();
   //             updateFilter.$set[`${mode}.pve.vol`] = playerCalc[mode].getVol();
   //             updateFilter.$inc[`${mode}.pve.games`] = 1;
   //             updateFilter.$inc[`${mode}.pve.songs`] = history[mode].songs.length;
   //             updateFilter.$push = {
   //                ...updateFilter.$push,
   //                [`${mode}.pve.matches`]: {
   //                   $each: [history[mode]],
   //                   $position: 0,
   //                   $slice: 5
   //                }
   //             };
   //          }
   //          return {
   //             updateOne: {
   //                filter: { osuid: playerId },
   //                update: updateFilter
   //             }
   //          };
   //       })
   //       .filter(v => v)
   // );
   // console.log("Players", playersDbWriteResult);

   // // Figure out which maps to update
   // for (const mode of Object.keys(maps) as GameMode[]) {
   //    const filteredMaplist = maplist.filter(m => m.mode === mode);
   //    const modeDbWriteResult = await mapsDb[mode].bulkWrite(
   //       filteredMaplist
   //          .map(({ map, ratings }) => {
   //             const updateFilter: UpdateFilter<DbBeatmap> = {
   //                $set: {}
   //             };
   //             const playedMods = Object.keys(ratings) as SimpleMod[];
   //             if (playedMods.length < 1) return;
   //             for (const mod of playedMods) {
   //                const modRating = ratings[mod];
   //                updateFilter.$set[`ratings.${mod}`] = {
   //                   rating: modRating.getRating(),
   //                   rd: modRating.getRd(),
   //                   vol: modRating.getVol()
   //                };
   //             }
   //             return {
   //                updateOne: {
   //                   filter: { _id: map._id },
   //                   update: updateFilter
   //                }
   //             };
   //          })
   //          .filter(v => v)
   //    );
   //    console.log(`${mode} maps`, modeDbWriteResult);
   // }

   revalidatePath("/profile");
}
