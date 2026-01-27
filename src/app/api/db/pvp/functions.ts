import { Glicko2, Player } from "glicko2";
import { GameMode, getModsEnum, LegacyClient, LegacyMultiplayerLobby, Mod } from "osu-web.js";
import { mapsDb, playersDb } from "../connection";
import { MpLobbyResults, SongResultMap, TeamMpLobbyResults } from "@/types/multiplayer";
import { DbBeatmap } from "@/types/database.beatmap";
import { ModPool, Rating } from "@/types/rating";
import { UpdateOneModel } from "mongodb";
import { getMaplist } from "@/helpers/server/currentPack";
import { matchResultValue } from "@/helpers/rating-range";
import { ScoreParser } from "@/helpers/scorev1";
import { getPlayerList } from "@/helpers/server/players";
import { getUpdatedModsFromBatch, getUpdatedStylesFromBatch } from "@/helpers/server/ratings";
import { DbPlayer } from "@/types/database.player";
import { ignoreSongMods } from "@/helpers/mods";
import { updateTeamScoreHistory } from "../team/functions";

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

function parseModpool(mods: Mod[], mode: GameMode): ModPool {
   mods = ignoreSongMods(mods);
   // If DT is in the modlist, assume the pool is DT and ignore everything else
   if (mods.includes("DT") || mods.includes("NC")) return "dt";
   // Catch generally allows HD in addition to other mods. Discard HD if it's not the only mod
   if (mode === "fruits" && mods.length > 1) mods = mods.filter(m => m !== "HD");
   // In order for the score to be valid, only one mod should be used
   if (mods.length > 1) return "fm";
   if (mods.length === 0) return "nm";
   else if (mode === "mania") {
      if (mods[0] === "DT" || mods[0] === "NC") return "dt";
      // Only reject EZ and HT
      if (mods[0] === "EZ" || mods[0] === "HT") return "fm";
      else return "nm";
   } else
      switch (mods[0]) {
         case "HD":
            return "hd";
         case "HR":
            return "hr";
         case "DT":
         case "NC":
            return "dt";
      }
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
      mods: Mod[];
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
         const allMods = [...game.mods];

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
            const playerMods = ignoreSongMods(game.mods.concat(score.enabled_mods));
            allMods.push(...playerMods);

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
         maps.push({ map, modpool: parseModpool(allMods, matchSettings.mode) });
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
      loserScores: teams[loserId].scores.map(s => ({ score: s })),
      winnerScores: teams[winnerId].scores.map(s => ({ score: s })),
      maps,
      redTeam: teams.Red.players,
      blueTeam: teams.Blue.players
   };
}

export async function addTeamsData({
   mp,
   mode,
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
   const playedMaps: {
      map: DbBeatmap;
      modpool: ModPool;
      mapCalc?: Player;
   }[] = maps.map(item => ({
      map: maplist.find(m => m._id === item.map),
      modpool: item.modpool
   }));

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
                              songs: playedMaps.map((m, i) => {
                                 const score = individualScores.find(
                                    is => is.player === p.player._id && is.map === m.map._id
                                 );
                                 return {
                                    map: {
                                       id: m.map._id,
                                       setid: m.map.setid,
                                       version: m.map.version
                                    },
                                    mods: score ? getModsEnum(score.mods, true) : null,
                                    score: playerScores[i].score,
                                    opponentScore: opponentScores[i].score
                                 };
                              })
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
   console.log("Player ratings", playerUpdateResult);

   // Update map ratings
   const mapCalculatorResults: [Player, Player, number][] = [];
   const modUpdatesObj: {
      mode: GameMode;
      score: { score: number; mods: Mod[] };
      player: {
         rating: Rating;
         _id: number;
         mods: Partial<Record<Mod, number>>;
         styles: number[];
      };
      map: {
         _id: number;
         rating: Rating;
         mods: Partial<Record<Mod, number>>;
         styles: number[];
      };
   }[] = [];

   for (const score of individualScores) {
      if (!score.mods) continue;
      const pMap = playedMaps.find(pm => pm.map._id === score.map);
      score.score.setMap(pMap.map);
      if (!pMap.mapCalc)
         pMap.mapCalc = calculator.makePlayer(
            pMap.map.rating.rating,
            pMap.map.rating.rd,
            pMap.map.rating.vol
         );
      const player = players.find(p => p.player._id === score.player);
      const playerCalc = player.ratingCalc;
      // Get mods multipliers
      const playerModsMult = score.mods.reduce((mult, mod) => mult * (player.player[mode].mods[mod] || 1), 1);
      const mapModsMult = score.mods.reduce((mult, mod) => mult * (pMap.map.mods[mod] || 1), 1);
      mapCalculatorResults.push([
         playerCalc,
         pMap.mapCalc,
         matchResultValue(score.score.getScore() * playerModsMult * mapModsMult, mode)
      ]);
      // Add data for mod multiplier updates
      modUpdatesObj.push({
         map: pMap.map,
         player: {
            _id: player.player._id,
            mods: player.player[mode].mods,
            rating: player.player[mode].pvp,
            styles: player.player[mode].styles
         },
         mode,
         score: {
            score: score.score.getScore(),
            mods: score.mods
         }
      });
   }
   calculator.updateRatings(mapCalculatorResults);
   const modRatingUpdates = getUpdatedModsFromBatch(modUpdatesObj);
   const styleRatingUpdates = getUpdatedStylesFromBatch(
      modUpdatesObj.map(score => ({ ...score, score: score.score.score }))
   );

   // Update song ratings in database
   const mapsResult = await mapsDb[mode].bulkWrite(
      playedMaps.map(pMap => ({
         updateOne: {
            filter: { _id: pMap.map._id },
            update: {
               $set: {
                  rating: {
                     rating: pMap.mapCalc.getRating(),
                     rd: pMap.mapCalc.getRd(),
                     vol: pMap.mapCalc.getVol()
                  },
                  ...Object.fromEntries(
                     Object.entries(modRatingUpdates.maps[mode][pMap.map._id]).map(
                        ([mod, multiplier]: [Mod, number]) => [`mods.${mod}`, multiplier]
                     )
                  ),
                  styles: styleRatingUpdates.maps[pMap.map._id]?.[mode] || pMap.map.styles
               }
            }
         } as UpdateOneModel<DbBeatmap>
      }))
   );
   console.log("Maps", mapsResult);
   // Update player mod multipliers
   const playerModResults = await playersDb.bulkWrite(
      players.map(p => ({
         updateOne: {
            filter: { _id: p.player._id },
            update: {
               $set: {
                  ...Object.fromEntries(
                     Object.entries(modRatingUpdates.players[p.player._id][mode]).map(
                        ([mod, multiplier]: [Mod, number]) => [`${mode}.mods.${mod}`, multiplier]
                     )
                  ),
                  [`${mode}.styles`]:
                     styleRatingUpdates.players[p.player._id]?.[mode] || p.player[mode].styles
               }
            }
         }
      }))
   );
   console.log("Player mods", playerModResults);
   // Add practice pool scores
   await updateTeamScoreHistory(
      individualScores.map(is => ({
         map: is.map,
         mode,
         mods: is.mods,
         player: is.player,
         score: is.score.getScore()
      }))
   );
}

export function parse1v1Lobby(lobby: LegacyMultiplayerLobby, warmups: number): MpLobbyResults {
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
            const allMods = [...game.mods];
            game.scores.forEach(score => {
               const scoreMods = ignoreSongMods(game.mods.concat(score.enabled_mods));
               allMods.push(...scoreMods);
               if (!(score.user_id in agg.scores)) agg.scores[score.user_id] = [];
               agg.scores[score.user_id].push({
                  score: score.score,
                  mods: scoreMods
               });
            });
            // Handle disconnects by the second player here
            if (game.scores.length === 1) {
               const missingPlayer = parseInt(
                  Object.keys(agg.scores).find(p => {
                     const pid = parseInt(p);
                     return !game.scores.find(s => s.user_id === pid);
                  })
               );
               if (!missingPlayer) throw new Error("Missing 1v1 player");
               agg.scores[missingPlayer].push({
                  score: 0,
                  mods: [...new Set(allMods)]
               });
            }
            const modpool = parseModpool(allMods, mode);
            console.log(`${lobby.match.match_id} - ${game.beatmap_id} +${modpool}`);
            agg.maps.push({
               map: game.beatmap_id,
               modpool
            });
            if (i >= warmups) {
               // Find the song winner
               const winner = game.scores.sort((a, b) => b.score - a.score)[0].user_id;
               agg.resultScore[winner] = (agg.resultScore[winner] || 0) + 1;
               // Make sure the loser is still counted, safely ignore cases where the loser dc'd
               // They will still be accounted for on other songs, presumably
               if (game.scores.length > 1)
                  agg.resultScore[game.scores[1].user_id] = agg.resultScore[game.scores[1].user_id] || 0;
            }
            return agg;
         },
         {
            maps: [] as SongResultMap[],
            scores: {} as { [id: number]: { score: number; mods: Mod[] }[] },
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
      winnerScores: result.scores[winnerId],
      loserScores: result.scores[loserId],
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
      modpool: item.modpool
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
                              mods: getModsEnum(winnerScores[i].mods, true),
                              modpool: m.modpool,
                              score: winnerScores[i].score,
                              opponentScore: loserScores[i].score
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
                              mods: getModsEnum(loserScores[i].mods, true),
                              score: loserScores[i].score,
                              opponentScore: winnerScores[i].score
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
   console.log("Player ratings", playerUpdateResult);

   // Update map ratings
   const mapResultsForCalc: {
      player: {
         player: DbPlayer;
         calc: Player;
      };
      map: {
         map: DbBeatmap;
         calc: Player;
      };
      score: number;
      mods: Mod[];
   }[] = playedMaps.flatMap((result, i) => {
      const { map } = result;
      const calc = calculator.makePlayer(map.rating.rating, map.rating.rd, map.rating.vol);
      return [
         {
            player: {
               player: winner,
               calc: winnerPlayer
            },
            map: { map, calc },
            mods: winnerScores[i].mods,
            score: winnerScores[i].score
         },
         {
            player: {
               player: loser,
               calc: loserPlayer
            },
            map: { map, calc },
            mods: loserScores[i].mods,
            score: loserScores[i].score
         }
      ];
   });

   const calculatorMatches: [Player, Player, number][] = mapResultsForCalc.map(result => [
      result.player.calc,
      result.map.calc,
      matchResultValue(result.score, mode, {
         mods: result.mods,
         player: result.player.player[mode].mods,
         map: result.map.map.mods
      })
   ]);
   calculator.updateRatings(calculatorMatches);
   const updatedModsValues = getUpdatedModsFromBatch(
      mapResultsForCalc.map(result => ({
         map: result.map.map,
         player: {
            _id: result.player.player._id,
            mods: result.player.player[mode].mods,
            rating: result.player.player[mode].pvp,
            styles: result.player.player[mode].styles
         },
         mode,
         score: {
            score: result.score,
            mods: result.mods
         }
      }))
   );
   const updatedSkillRatings = getUpdatedStylesFromBatch(
      mapResultsForCalc.map(result => ({
         map: result.map.map,
         player: {
            _id: result.player.player._id,
            rating: result.player.player[mode].pvp,
            styles: result.player.player[mode].styles
         },
         mode,
         score: result.score
      }))
   );

   // Update song ratings in database
   const mapsResult = await mapsDb[mode].bulkWrite(
      Object.keys(updatedModsValues.maps[mode]).map(mapidstr => {
         const mapid = parseInt(mapidstr);
         const mapInfo = mapResultsForCalc.find(res => res.map.map._id === mapid).map;
         const mapRating = mapInfo.calc;
         return {
            updateOne: {
               filter: { _id: mapid },
               update: {
                  $set: {
                     rating: {
                        rating: mapRating.getRating(),
                        rd: mapRating.getRd(),
                        vol: mapRating.getVol()
                     },
                     ...Object.fromEntries(
                        Object.entries(updatedModsValues.maps[mode][mapid]).map(
                           ([mod, multiplier]: [Mod, number]) => [`mods.${mod}`, multiplier]
                        )
                     ),
                     styles: updatedSkillRatings.maps[mapid]?.[mode] || mapInfo.map.styles
                  }
               }
            } as UpdateOneModel<DbBeatmap>
         };
      })
   );
   console.log("Map ratings", mapsResult);

   // Update player mods values
   const playerModsResults = await playersDb.bulkWrite(
      Object.keys(updatedModsValues.players).map(pidstr => {
         const playerid = parseInt(pidstr);
         const playerInfo = mapResultsForCalc.find(res => res.player.player._id === playerid).player.player[
            mode
         ];
         return {
            updateOne: {
               filter: { _id: playerid },
               update: {
                  $set: {
                     ...Object.fromEntries(
                        Object.entries(updatedModsValues.players[playerid][mode]).map(
                           ([mod, multiplier]: [Mod, number]) => [`${mode}.mods.${mod}`, multiplier]
                        )
                     ),
                     [`${mode}.styles`]: updatedSkillRatings.players[playerid]?.[mode] || playerInfo.styles
                  }
               }
            }
         };
      })
   );
   console.log("Player mods", playerModsResults);

   // Update team practice pools
   await updateTeamScoreHistory(
      mapResultsForCalc.map(mrc => ({
         map: mrc.map.map._id,
         mode,
         mods: mrc.mods,
         player: mrc.player.player._id,
         score: mrc.score
      }))
   );
}
