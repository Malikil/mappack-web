import { Glicko2, Player } from "glicko2";
import { GameMode, LegacyClient, LegacyMultiplayerLobby, Mod } from "osu-web.js";
import { mapsDb, playersDb } from "../connection";
import { FreemodSelection, MpLobbyResults, SongResultMap, TeamMpLobbyResults } from "@/types/multiplayer";
import { DbBeatmap } from "@/types/database.beatmap";
import { ModPool, SimpleMod } from "@/types/rating";
import { UpdateOneModel } from "mongodb";
import { getMaplist } from "@/helpers/server/currentPack";
import { matchResultValue } from "@/helpers/rating-range";
import { ignoreSongMods } from "@/app/profile/[playerid]/pve/functions";
import { ScoreParser } from "@/helpers/scorev1";
import { getPlayerList } from "@/helpers/server/players";

const MATCH_HISTORY_SIZE = 10;

/** @deprecated Use function from ~/helpers/server/players.ts */
export async function createPvpRegistration(osuid: number, ppRaw: number, mode: GameMode = "osu") {
   const player = await playersDb.findOneAndUpdate(
      { _id: osuid, [`${mode}.pvp`]: { $exists: false } },
      {
         $set: {
            [`${mode}.pvp`]: {
               rating: 1500,
               rd: 350,
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

function parseTeamsLobby(lobby: LegacyMultiplayerLobby, warmups: number): TeamMpLobbyResults {
   const maps: SongResultMap[] = [];
   const individualMatchups: {
      players: [number, number];
      pointDiff: number;
   }[] = [];
   const scores: {
      player: number;
      map: number;
      score: ScoreParser;
      mods: SimpleMod;
   }[] = [];
   const teams = {
      Red: {
         points: 0,
         scores: [] as number[],
         players: [] as number[]
      },
      Blue: {
         points: 0,
         scores: [] as number[],
         players: [] as number[]
      }
   };
   const matchSettings: {
      mp: number;
      warmups: number;
      mode?: GameMode;
   } = {
      mp: lobby.match.match_id,
      warmups
   };

   lobby.games
      .slice(warmups)
      .filter(g => g.end_time)
      .forEach(game => {
         if (game.team_type !== "Team VS") throw new Error("Invalid team type");
         if (game.scoring_type === "Accuracy" || game.scoring_type === "Combo")
            throw new Error("Invalid score type");
         if (matchSettings.mode) {
            if (matchSettings.mode !== game.play_mode) throw new Error("Game mode switched");
         } else matchSettings.mode = game.play_mode;

         // Find the map/modpool
         const map = game.beatmap_id;
         let modpool: ModPool = ignoreSongMods(game.mods, [], game.play_mode);
         let nmSeen = false;

         const matchScore = {
            Red: 0,
            Blue: 0
         };
         game.scores.forEach(score => {
            // Verify this player's team
            if (!teams[score.team].players.includes(score.user_id)) {
               // Make sure the player isn't on the other team
               if (teams[score.team === "Blue" ? "Red" : "Blue"].players.includes(score.user_id))
                  throw new Error("Player played for invalid team");
               // Add the player to this team
               teams[score.team].players.push(score.user_id);
            }
            // Add to team's total score
            matchScore[score.team] += score.score;
            // If this score uses different mods from the lobby's mods, upgrade the lobby's mods
            // nm -> hd/hr -> fm      If the lobby mod is dt leave it as-is
            const playerMods = ignoreSongMods(game.mods, score.enabled_mods, game.play_mode);
            if (modpool === "nm")
               if (playerMods === "nm") nmSeen = true;
               else modpool = playerMods;
            else if (
               (modpool === "hd" && playerMods === "hr") ||
               (modpool === "hr" && playerMods === "hd") ||
               (nmSeen && playerMods !== "nm")
            )
               modpool = "fm";

            // Add the individual score
            scores.push({
               map,
               mods: playerMods,
               player: score.user_id,
               score: new ScoreParser(score, game.scoring_type, game.play_mode)
            });

            // Run through each opponent, check if this player won or lost vs them
            // To avoid counting scores twice, only consider when the current user is lower id value
            game.scores
               .filter(oppScore => oppScore.team !== score.team && score.user_id < oppScore.user_id)
               .forEach(oppScore => {
                  const matchupIndex = individualMatchups.findIndex(
                     m => m.players[0] === score.user_id && m.players[1] === oppScore.user_id
                  );
                  const matchup = individualMatchups[matchupIndex] || {
                     players: [score.user_id, oppScore.user_id],
                     pointDiff: 0
                  };
                  matchup.pointDiff +=
                     score.score === oppScore.score ? 0 : score.score > oppScore.score ? 1 : -1;
                  if (matchupIndex < 0) individualMatchups.push(matchup);
               });
         });
         // Figure out which team won
         teams.Red.scores.push(matchScore.Red);
         teams.Blue.scores.push(matchScore.Blue);
         if (matchScore.Red > matchScore.Blue) teams.Red.points++;
         else teams.Blue.points++;

         // Add the map/mod to the maplist
         maps.push({ map, mod: modpool });
      });

   const [loserId, winnerId] =
      teams.Red.points > teams.Blue.points ? (["Blue", "Red"] as const) : (["Red", "Blue"] as const);
   return {
      mp: matchSettings.mp,
      mode: matchSettings.mode,
      warmups: matchSettings.warmups,
      individualMatchups,
      individualScores: scores,
      loserId,
      winnerId,
      loserScores: teams[loserId].scores.map(s => [s, null]),
      winnerScores: teams[winnerId].scores.map(s => [s, null]),
      maps,
      redTeam: teams.Red.players,
      blueTeam: teams.Blue.players
   };
}

export async function addTeamsData({
   mp,
   mode,
   warmups,
   maps,
   blueTeam,
   redTeam,
   individualMatchups,
   winnerId,
   winnerScores,
   loserScores,
   individualScores
}: TeamMpLobbyResults) {
   // Get the played maps
   const maplist = await getMaplist(
      mode,
      maps.map(item => item.map)
   );
   const playedMaps = maps.map(item => ({
      map: maplist.find(m => m._id === item.map),
      mod: item.mod
   }));
   console.log(playedMaps);

   // Create the rating calculator
   const calculator = new Glicko2();
   const players = (await getPlayerList(blueTeam.concat(redTeam), mode, true)).map(p => ({
      player: p,
      ratingCalc: calculator.makePlayer(p[mode].pvp.rating, p[mode].pvp.rd, p[mode].pvp.vol)
   }));

   // Calculate average rating for each team (used in history display)
   const redAverage =
      redTeam.reduce((sum, pid) => {
         const player = players.find(p => p.player._id === pid);
         return sum + player.player[mode].pvp.rating;
      }, 0) / redTeam.length;
   const blueAverage =
      blueTeam.reduce((sum, pid) => {
         const player = players.find(p => p.player._id === pid);
         return sum + player.player[mode].pvp.rating;
      }, 0) / redTeam.length;

   // Update player ratings
   const calculatorUpdates: [Player, Player, number][] = individualMatchups.map(matchup => {
      const [p1, p2] = matchup.players;
      const calc1 = players.find(p => p.player._id === p1);
      const calc2 = players.find(p => p.player._id === p2);
      const winLoss = matchup.pointDiff < 0 ? 0 : matchup.pointDiff > 0 ? 1 : 0.5;
      return [calc1.ratingCalc, calc2.ratingCalc, winLoss];
   });
   calculator.updateRatings(calculatorUpdates);

   // Write player ratings back to db
   const playerUpdateResult = await playersDb.bulkWrite(
      players.map(p => {
         const isWinner =
            winnerId === "Red" ? redTeam.includes(p.player._id) : blueTeam.includes(p.player._id);
         const [playerScores, opponentScores] = isWinner
            ? [winnerScores, loserScores]
            : [loserScores, winnerScores];
         const opponent = redTeam.includes(p.player._id)
            ? { name: "Blue Team", rating: blueAverage }
            : { name: "Red Team", rating: redAverage };
         return {
            updateOne: {
               filter: { _id: p.player._id },
               update: {
                  $set: {
                     [`${mode}.pvp.rating`]: p.ratingCalc.getRating(),
                     [`${mode}.pvp.rd`]: p.ratingCalc.getRd(),
                     [`${mode}.pvp.vol`]: p.ratingCalc.getVol()
                  },
                  $inc: {
                     [`${mode}.pvp.wins`]: +isWinner,
                     [`${mode}.pvp.losses`]: +!isWinner
                  },
                  $push: {
                     [`${mode}.pvp.matches`]: {
                        $each: [
                           {
                              mp,
                              prevRating: p.player[mode].pvp.rating,
                              ratingDiff: p.ratingCalc.getRating() - p.player[mode].pvp.rating,
                              opponent,
                              songs: playedMaps.map((m, i) => ({
                                 map: {
                                    id: m.map._id,
                                    setid: m.map.setid,
                                    version: m.map.version
                                 },
                                 mod: m.mod,
                                 score: playerScores[i][0],
                                 opponentScore: opponentScores[i][0]
                              })),
                              warmups
                           }
                        ],
                        $position: 0,
                        $slice: MATCH_HISTORY_SIZE
                     }
                  }
               }
            }
         };
      })
   );
   console.log(playerUpdateResult);

   // Update map ratings
   const calculatorMaplist: { map: number; mod: SimpleMod; rating: Player }[] = [];
   const mapCalculatorResults: [Player, Player, number][] = [];
   for (const score of individualScores) {
      if (!score.mods) continue;
      const map = playedMaps.find(pm => pm.map._id === score.map).map;
      score.score.setMap(map);
      if (!calculatorMaplist.find(m => m.map === score.map && m.mod === score.mods)) {
         calculatorMaplist.push({
            map: score.map,
            mod: score.mods,
            rating: calculator.makePlayer(
               map.ratings[score.mods].rating,
               map.ratings[score.mods].rd,
               map.ratings[score.mods].vol
            )
         });
      }
      const mapCalc = calculatorMaplist.find(m => m.map === score.map && m.mod === score.mods).rating;
      const playerCalc = players.find(p => p.player._id === score.player).ratingCalc;
      mapCalculatorResults.push([playerCalc, mapCalc, matchResultValue(score.score.getScore(), mode)]);
   }
   calculator.updateRatings(mapCalculatorResults);

   // Update song ratings in database
   const uniqueMaps = calculatorMaplist.reduce(
      (unique, candidate) => {
         let exist = unique.find(m => m.map === candidate.map);
         if (!exist) {
            exist = { map: candidate.map, mod: [] };
            unique.push(exist);
         }
         if (!exist.mod.find(m => m.mod === candidate.mod))
            exist.mod.push({ mod: candidate.mod, calc: candidate.rating });

         return unique;
      },
      [] as {
         map: number;
         mod: {
            mod: SimpleMod;
            calc: Player;
         }[];
      }[]
   );
   const mapsResult = await mapsDb[mode].bulkWrite(
      uniqueMaps.map(outcome => ({
         updateOne: {
            filter: { _id: outcome.map },
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

function parse1v1Lobby(lobby: LegacyMultiplayerLobby, warmups: number): MpLobbyResults {
   const mode = lobby.games[warmups]?.play_mode;
   // Is end time an indicator of aborted matches?
   const result = lobby.games
      .filter(l => l.end_time)
      .reduce(
         (agg, game, i) => {
            // For now only accept score v2 songs
            if (game.scoring_type !== "Score V2") return agg;
            // For now, if the gamemode is changed panic
            if (game.play_mode !== mode) throw new Error("Invalid gamemode");
            // Ignore NF and mania-specific mods
            const ignoreMods: Mod[] = ["NF", "MR", "FI", "FL", "SD", "PF"];
            const filteredMods = game.mods.filter(mod => !ignoreMods.includes(mod));
            const mod = filteredMods.length > 1 ? null : (filteredMods[0] || "nm").toLowerCase();
            if (!mod || !["nm", "hd", "hr", "dt"].includes(mod)) return agg;
            const playedMap = {
               map: game.beatmap_id,
               mod: mod as ModPool
            };
            game.scores.forEach(score => {
               if (score.enabled_mods.length > 0) playedMap.mod = "fm";
               // Will HD always be first?
               const scoreMod = score.enabled_mods
                  .filter(m => !ignoreMods.includes(m))
                  .join("")
                  .toLowerCase();
               if (!(score.user_id in agg.scores)) agg.scores[score.user_id] = [];
               agg.scores[score.user_id].push({
                  score: score.score,
                  mod: ["hd", "hr", "hdhr"].includes(scoreMod) ? (scoreMod as FreemodSelection) : null
               });
            });
            console.log(`${lobby.match.match_id} - ${game.beatmap_id} +${playedMap.mod}`);
            agg.maps.push(playedMap);
            if (i >= warmups) {
               // Find the song winner
               const winner = game.scores.sort((a, b) => b.score - a.score)[0].user_id;
               agg.resultScore[winner] = (agg.resultScore[winner] || 0) + 1;
               // Make sure the loser is still counted
               agg.resultScore[game.scores[1].user_id] = agg.resultScore[game.scores[1].user_id] || 0;
            }
            return agg;
         },
         {
            maps: [] as SongResultMap[],
            scores: {} as { [id: number]: { score: number; mod?: FreemodSelection }[] },
            resultScore: {} as { [id: number]: number }
         }
      );
   const playersWithResults = Object.keys(result.resultScore).map(v => parseInt(v));
   console.log(`${lobby.match.match_id} - ${playersWithResults.length} players with results`);
   // If there are more or less than 2 players, this must not be a 1v1 match
   if (playersWithResults.length !== 2) return;
   const [winnerId, loserId] = playersWithResults.sort(
      (a, b) => result.resultScore[b] - result.resultScore[a]
   );
   console.log(lobby.match.match_id, result);
   return {
      mp: lobby.match.match_id,
      mode,
      warmups,
      maps: result.maps,
      winnerScores: result.scores[winnerId].map(item => [item.score, item.mod]),
      loserScores: result.scores[loserId].map(item => [item.score, item.mod]),
      winnerId,
      loserId
   };
}

/**
 * Returns null if an invalid match is detected
 */
export async function parseMpLobby(mp: number, warmups = 0, acceptIncomplete = false) {
   const osuClient = new LegacyClient(process.env.OSU_LEGACY_KEY);
   try {
      console.log(`Fetch multiplayer lobby ${mp}`);
      const mpLobby = await osuClient.getMultiplayerLobby({ mp });
      // Only accept completed lobbies
      if (!acceptIncomplete && !mpLobby.match.end_time) return;
      // Decide which type of lobby this is
      if (mpLobby.games[warmups].team_type === "Head To Head") return parse1v1Lobby(mpLobby, warmups);
      else if (mpLobby.games[warmups].team_type === "Team VS") return parseTeamsLobby(mpLobby, warmups);
      // Other team types are invalid

      // Is end time an indicator of aborted matches?
      // const result = mpLobby.games
      //    .filter(l => l.end_time)
      //    .reduce(
      //       (agg, game, i) => {
      //          // For now only accept score v2 songs
      //          if (game.scoring_type !== "Score V2") return agg;
      //          // For now, if the gamemode is changed panic
      //          if (game.play_mode !== mode) throw new Error("Invalid gamemode");
      //          // Ignore NF and mania-specific mods
      //          const ignoreMods: Mod[] = ["NF", "MR", "FI", "FL", "SD", "PF"];
      //          const filteredMods = game.mods.filter(mod => !ignoreMods.includes(mod));
      //          const mod = filteredMods.length > 1 ? null : (filteredMods[0] || "nm").toLowerCase();
      //          if (!mod || !["nm", "hd", "hr", "dt"].includes(mod)) return agg;
      //          const playedMap = {
      //             map: game.beatmap_id,
      //             mod: mod as ModPool
      //          };
      //          game.scores.forEach(score => {
      //             if (score.enabled_mods.length > 0) playedMap.mod = "fm";
      //             // Will HD always be first?
      //             const scoreMod = score.enabled_mods
      //                .filter(m => !ignoreMods.includes(m))
      //                .join("")
      //                .toLowerCase();
      //             if (!(score.user_id in agg.scores)) agg.scores[score.user_id] = [];
      //             agg.scores[score.user_id].push({
      //                score: score.score,
      //                mod: ["hd", "hr", "hdhr"].includes(scoreMod) ? (scoreMod as FreemodSelection) : null
      //             });
      //          });
      //          console.log(`${mp} - ${game.beatmap_id} +${playedMap.mod}`);
      //          agg.maps.push(playedMap);
      //          if (i >= warmups) {
      //             // Find the song winner
      //             const winner = game.scores.sort((a, b) => b.score - a.score)[0].user_id;
      //             agg.resultScore[winner] = (agg.resultScore[winner] || 0) + 1;
      //             // Make sure the loser is still counted
      //             agg.resultScore[game.scores[1].user_id] = agg.resultScore[game.scores[1].user_id] || 0;
      //          }
      //          return agg;
      //       },
      //       {
      //          maps: [] as SongResultMap[],
      //          scores: {} as { [id: number]: { score: number; mod?: FreemodSelection }[] },
      //          resultScore: {} as { [id: number]: number }
      //       }
      //    );
      // const playersWithResults = Object.keys(result.resultScore).map(v => parseInt(v));
      // console.log(`${mp} - ${playersWithResults.length} players with results`);
      // // If there are more or less than 2 players, this must not be a 1v1 match
      // if (playersWithResults.length !== 2) return;
      // const [winnerId, loserId] = playersWithResults.sort(
      //    (a, b) => result.resultScore[b] - result.resultScore[a]
      // );
      // console.log(mp, result);
      // return {
      //    mp,
      //    mode,
      //    warmups,
      //    maps: result.maps,
      //    winnerScores: result.scores[winnerId].map(item => [item.score, item.mod]),
      //    loserScores: result.scores[loserId].map(item => [item.score, item.mod]),
      //    winnerId,
      //    loserId
      // };
   } catch (err) {
      console.warn(err);
   }
}

export async function addMatchData({
   mp,
   mode,
   warmups,
   winnerId,
   loserId,
   maps,
   winnerScores,
   loserScores
}: MpLobbyResults) {
   console.log(winnerScores, loserScores);
   const winner = await playersDb.findOne({
      _id: winnerId
   });
   const winnerRating = winner[mode].pvp;
   const loser = await playersDb.findOne({
      _id: loserId
   });
   const loserRating = loser[mode].pvp;
   console.log(winner, loser);
   // Get the played maps
   const maplist = await getMaplist(
      mode,
      maps.map(item => item.map)
   );
   const playedMaps = maps.map(item => ({
      map: maplist.find(m => m._id === item.map),
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
                              id: loser._id,
                              name: loser.osuname,
                              rating: loserRating.rating
                           },
                           songs: playedMaps.map((m, i) => ({
                              map: {
                                 id: m.map._id,
                                 setid: m.map.setid,
                                 version: m.map.version
                              },
                              mod: m.mod,
                              score: winnerScores[i][0],
                              opponentScore: loserScores[i][0]
                           })),
                           warmups
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
                              id: winner._id,
                              name: winner.osuname,
                              rating: winnerRating.rating
                           },
                           songs: playedMaps.map((m, i) => ({
                              map: {
                                 id: m.map._id,
                                 setid: m.map.setid,
                                 version: m.map.version
                              },
                              mod: m.mod,
                              score: loserScores[i][0],
                              opponentScore: winnerScores[i][0]
                           })),
                           warmups
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
            if (wmod in map.ratings) {
               const r = map.ratings[wmod];
               resultArr.push({
                  map,
                  mod: wmod as SimpleMod,
                  calc: calculator.makePlayer(r.rating, r.rd, r.vol),
                  score: wscore,
                  player: winnerPlayer
               });
            }
            if (lmod in map.ratings) {
               const r = map.ratings[lmod];
               resultArr.push({
                  map,
                  mod: lmod as SimpleMod,
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
         let exist = unique.find(m => m.map._id === candidate.map._id);
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
   const mapsResult = await mapsDb[mode].bulkWrite(
      uniqueMaps.map(outcome => ({
         updateOne: {
            filter: { _id: outcome.map._id },
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
