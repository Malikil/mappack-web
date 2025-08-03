import { Glicko2, Player } from "glicko2";
import { GameMode, LegacyClient } from "osu-web.js";
import { mapsDb, playersDb } from "../connection";
import { matchResultValue } from "@/app/profile/[playerid]/pve/functions";
import { convertPP } from "@/helpers/rankPredictor";
import { FreemodSelection, MpLobbyResults, SongResultMap } from "@/types/multiplayer";
import { DbBeatmap } from "@/types/database.beatmap";
import { SimpleMod } from "@/types/rating";
import { UpdateOneModel } from "mongodb";
import { getMaplist } from "@/helpers/currentPack";

const MATCH_HISTORY_SIZE = 10;

export async function createPvpRegistration(osuid: number, ppRaw: number, mode: GameMode = "osu") {
   const player = await playersDb.findOneAndUpdate(
      { osuid, [`${mode}.pvp`]: { $exists: false } },
      {
         $set: {
            [`${mode}.pvp`]: {
               rating: convertPP(ppRaw, mode),
               rd: 175,
               vol: 0.06,
               matches: [],
               wins: 0,
               losses: 0
            }
         }
      },
      { returnDocument: "after" }
   );
   return player;
}

/**
 * Returns null if an invalid 1v1 is detected
 */
export async function parseMpLobby(link: string): Promise<MpLobbyResults> {
   const osuClient = new LegacyClient(process.env.OSU_LEGACY_KEY);
   const matchIdSegment = parseInt(link.slice(link.lastIndexOf("/") + 1));
   try {
      console.log(`Fetch multiplayer lobby ${matchIdSegment}`);
      const mpLobby = await osuClient.getMultiplayerLobby({ mp: matchIdSegment });
      const mode = mpLobby.games[0]?.play_mode;
      // Is end time an indicator of aborted matches?
      const result = mpLobby.games
         .filter(l => l.end_time)
         .reduce(
            (agg, game) => {
               // For now only accept score v2 songs
               if (game.scoring_type !== "Score V2") return agg;
               // For now, if the gamemode is changed panic
               if (game.play_mode !== mode) throw new Error("Invalid gamemode");
               // If length is 0, that means freemod is enabled. Length will be 1 if nomod (nf counts as the 1)
               const mod =
                  game.mods.length === 0
                     ? "fm"
                     : game.mods.length > 2
                     ? null
                     : (game.mods.filter(v => v !== "NF").join("") || "nm").toLowerCase();
               if (!mod || !["nm", "hd", "hr", "dt", "fm"].includes(mod)) return agg;
               agg.maps.push({
                  map: game.beatmap_id,
                  mod: mod as SimpleMod | "fm"
               });
               game.scores.forEach(score => {
                  // Will HD always be first?
                  const scoreMod = score.enabled_mods
                     .filter(v => v !== "NF")
                     .join("")
                     .toLowerCase();
                  if (!(score.user_id in agg.scores)) agg.scores[score.user_id] = [];
                  agg.scores[score.user_id].push({
                     score: score.score,
                     mod: ["hd", "hr", "hdhr"].includes(scoreMod) ? (scoreMod as FreemodSelection) : null
                  });
               });
               // Find the song winner
               const winner = game.scores.sort((a, b) => b.score - a.score)[0].user_id;
               agg.resultScore[winner] = (agg.resultScore[winner] || 0) + 1;
               // Make sure the loser is still counted
               agg.resultScore[game.scores[1].user_id] = agg.resultScore[game.scores[1].user_id] || 0;
               return agg;
            },
            {
               maps: [] as SongResultMap[],
               scores: {} as { [id: number]: { score: number; mod?: FreemodSelection }[] },
               resultScore: {} as { [id: number]: number }
            }
         );
      const playersWithResults = Object.keys(result.resultScore).map(v => parseInt(v));
      // If there are more or less than 2 players, this must not be a 1v1 match
      if (playersWithResults.length !== 2) return;
      const [winnerId, loserId] = playersWithResults.sort(
         (a, b) => result.resultScore[b] - result.resultScore[a]
      );
      console.log(result);
      return {
         mp: matchIdSegment,
         mode,
         maps: result.maps,
         winnerScores: result.scores[winnerId].map(item => [item.score, item.mod]),
         loserScores: result.scores[loserId].map(item => [item.score, item.mod]),
         winnerId,
         loserId
      };
   } catch (err) {
      console.warn(err);
   }
}

export async function addMatchData({
   mp,
   mode,
   winnerId,
   loserId,
   maps,
   winnerScores,
   loserScores
}: MpLobbyResults) {
   console.log(winnerScores, loserScores);
   const winner = await playersDb.findOne({
      osuid: winnerId
   });
   const winnerRating = winner[mode].pvp;
   const loser = await playersDb.findOne({
      osuid: loserId
   });
   const loserRating = loser[mode].pvp;
   console.log(winner, loser);
   // Get the played maps
   const maplist = await getMaplist(maps.map(item => ({ id: item.map, mode })));
   const playedMaps = maps.map(item => ({
      map: maplist.find(m => m.id === item.map),
      mod: item.mod
   }));
   console.log(playedMaps);

   // Create the rating calculator
   const calculator = new Glicko2();
   const winnerPlayer = calculator.makePlayer(winnerRating.rating, winnerRating.rd, winnerRating.vol);
   const loserPlayer = calculator.makePlayer(loserRating.rating, loserRating.rd, loserRating.vol);
   // Update player ratings
   calculator.updateRatings([[winnerPlayer, loserPlayer, 1]]);
   const playerUpdateResult = await playersDb.bulkWrite([
      {
         updateOne: {
            filter: { _id: winner._id },
            update: {
               $set: {
                  [`${mode}.pvp.rating`]: winnerPlayer.getRating(),
                  [`${mode}.pvp.rd`]: winnerPlayer.getRd(),
                  [`${mode}.pvp.vol`]: winnerPlayer.getVol()
               },
               $inc: { [`${mode}.pvp.wins`]: 1 },
               $push: {
                  [`${mode}.pvp.matches`]: {
                     $each: [
                        {
                           mp,
                           prevRating: winnerRating.rating,
                           ratingDiff: winnerPlayer.getRating() - winnerRating.rating,
                           opponent: {
                              id: loser.osuid,
                              name: loser.osuname,
                              rating: loserRating.rating
                           },
                           songs: playedMaps.map((m, i) => ({
                              map: {
                                 id: m.map.id,
                                 setid: m.map.setid,
                                 version: m.map.version
                              },
                              mod: m.mod,
                              score: winnerScores[i][0],
                              opponentScore: loserScores[i][0]
                           }))
                        }
                     ],
                     $position: 0,
                     $slice: MATCH_HISTORY_SIZE
                  }
               }
            }
         }
      },
      {
         updateOne: {
            filter: { _id: loser._id },
            update: {
               $set: {
                  [`${mode}.pvp.rating`]: loserPlayer.getRating(),
                  [`${mode}.pvp.rd`]: loserPlayer.getRd(),
                  [`${mode}.pvp.vol`]: loserPlayer.getVol()
               },
               $inc: { [`${mode}.pvp.losses`]: 1 },
               $push: {
                  [`${mode}.pvp.matches`]: {
                     $each: [
                        {
                           mp,
                           prevRating: loserRating.rating,
                           ratingDiff: loserPlayer.getRating() - loserRating.rating,
                           opponent: {
                              id: winner.osuid,
                              name: winner.osuname,
                              rating: winnerRating.rating
                           },
                           songs: playedMaps.map((m, i) => ({
                              map: {
                                 id: m.map.id,
                                 setid: m.map.setid,
                                 version: m.map.version
                              },
                              mod: m.mod,
                              score: loserScores[i][0],
                              opponentScore: winnerScores[i][0]
                           }))
                        }
                     ],
                     $position: 0,
                     $slice: MATCH_HISTORY_SIZE
                  }
               }
            }
         }
      }
   ]);
   console.log(playerUpdateResult);

   // Update map ratings
   const songlistCombined = playedMaps.flatMap((result, i) => {
      const { map, mod } = result;
      const wscore = winnerScores[i][0];
      const lscore = loserScores[i][0];
      if (mod === "fm") {
         const wmod = winnerScores[i][1];
         const lmod = loserScores[i][1];
         // If they used the same mods, treat it like a map from a specific modpool
         // If they both used HDHR the map can be skipped entirely
         if (wmod === lmod)
            if (wmod === "hdhr") return [];
            else {
               // On freemod maps the w/l mods may actually be null
               const r = map.ratings[wmod || "nm"];
               const resultObj: {
                  map: DbBeatmap;
                  calc: Player;
                  mod: SimpleMod;
               } = {
                  map,
                  calc: calculator.makePlayer(r.rating, r.rd, r.vol),
                  mod: wmod || "nm"
               };
               return [
                  { ...resultObj, score: wscore, player: winnerPlayer },
                  { ...resultObj, score: lscore, player: loserPlayer }
               ];
            }
         else {
            // They used different mods, handle each individually
            const resultArr: {
               map: DbBeatmap;
               mod: SimpleMod;
               calc: Player;
               score: number;
               player: Player;
            }[] = [];
            if (wmod !== "hdhr") {
               const r = map.ratings[wmod];
               resultArr.push({
                  map,
                  mod: wmod,
                  calc: calculator.makePlayer(r.rating, r.rd, r.vol),
                  score: wscore,
                  player: winnerPlayer
               });
            }
            if (lmod !== "hdhr") {
               const r = map.ratings[lmod];
               resultArr.push({
                  map,
                  mod: lmod,
                  calc: calculator.makePlayer(r.rating, r.rd, r.vol),
                  score: lscore,
                  player: loserPlayer
               });
            }
            return resultArr;
         }
      } else {
         // Not from FM pool
         console.log(result);
         const r = map.ratings[mod];
         const resultObj = { map, mod, calc: calculator.makePlayer(r.rating, r.rd, r.vol) };
         return [
            { ...resultObj, score: wscore, player: winnerPlayer },
            { ...resultObj, score: lscore, player: loserPlayer }
         ];
      }
   });

   const calculatorMatches: [Player, Player, number][] = songlistCombined.map(result => [
      result.player,
      result.calc,
      matchResultValue(result.score, "osu")
   ]);
   calculator.updateRatings(calculatorMatches);

   // Update song ratings in database
   const uniqueMaps = songlistCombined.reduce(
      (unique, candidate) => {
         let exist = unique.find(m => m.map.id === candidate.map.id);
         if (!exist) {
            exist = { map: candidate.map, mod: [] };
            unique.push(exist);
         }
         if (!exist.mod.find(m => m.mod === candidate.mod))
            exist.mod.push({ mod: candidate.mod, calc: candidate.calc });

         return unique;
      },
      [] as {
         map: DbBeatmap;
         mod: {
            mod: SimpleMod;
            calc: Player;
            //player: Player;
            //score: number;
         }[];
      }[]
   );
   const mapsResult = await mapsDb.bulkWrite(
      uniqueMaps.map(outcome => ({
         updateOne: {
            filter: { id: outcome.map.id, mode: outcome.map.mode },
            update: {
               $set: Object.fromEntries(
                  outcome.mod.map(mod => [
                     `ratings.${mod.mod}`,
                     {
                        rating: mod.calc.getRating(),
                        rd: mod.calc.getRd(),
                        vol: mod.calc.getVol()
                     }
                  ])
               )
            }
         } as UpdateOneModel<DbBeatmap>
      }))
   );
   console.log(mapsResult);
}
