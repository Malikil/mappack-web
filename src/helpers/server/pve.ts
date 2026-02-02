import { GameMode, getModsEnum, Mod } from "osu-web.js";
import { ScoreParserV2 } from "../scorev1";
import { getMaplist } from "./currentPack";
import { DbBeatmap } from "@/types/database.beatmap";
import { DbPlayer, MatchHistorySong } from "@/types/database.player";
import { getPlayerList } from "./players";
import { ignoreSongMods } from "../mods";
import { Glicko2, Player } from "glicko2";
import { matchResultValue } from "../rating-range";
import { getUpdatedModsFromBatch, getUpdatedStylesFromBatch } from "./ratings";
import { UpdateFilter, UpdateOneModel } from "mongodb";
import { mapsDb, playersDb } from "@/app/api/db/connection";
import { updateTeamScoreHistory } from "@/app/api/db/team/functions";
import { MatchGame, MatchInfo } from "@/types/undocumented/matches";

const ALL_MODES: GameMode[] = ["osu", "fruits", "taiko", "mania"];

function validateGameSettings(game: MatchGame) {
   if (!game.end_time) return false; // Song was aborted
   if (game.scoring_type === "accuracy" || game.scoring_type === "combo") return false;
   if (game.team_type === "tag-coop" || game.team_type === "tag-team-vs") return false;
   return true;
}

async function fetchMaplist(games: MatchGame[]) {
   const modeMaps: { [mode in GameMode]: number[] } = {
      osu: [],
      fruits: [],
      taiko: [],
      mania: []
   };
   for (const game of games) {
      if (validateGameSettings(game)) modeMaps[game.mode].push(game.beatmap_id);
   }
   const maplist: { [mode in GameMode]: DbBeatmap[] } = {
      osu: [],
      fruits: [],
      taiko: [],
      mania: []
   };
   for (const mode of ALL_MODES)
      if (modeMaps[mode].length > 0) maplist[mode] = await getMaplist(mode, modeMaps[mode]);
   return maplist;
}

function validateGame(game: MatchGame, maplist: Record<GameMode, DbBeatmap[]>) {
   if (!validateGameSettings(game)) return;

   // Skip maps without any valid scores
   const scores = game.scores
      .map(score => {
         // If there are double the number of misses as good hits
         if (score.statistics.count_miss > score.statistics.count_300 * 2) return;
         return {
            score,
            parser: new ScoreParserV2(score, game.scoring_type === "scorev2" ? "Score V2" : "Score")
         };
      })
      .filter(v => v);
   if (scores.length < 1) return; // No valid scores

   // Make sure the map exists
   const workingMap = maplist[game.mode].find(m => m._id === game.beatmap_id);
   if (!workingMap) return; // Missing beatmap

   // Add map to score parsers
   scores.forEach(s => s.parser.setMap(workingMap));

   return {
      workingMap,
      scores: scores
         .filter(s => s.parser.getScore())
         .map(s => ({
            user: s.score.user_id,
            score: s.parser,
            mods: ignoreSongMods(s.score.mods)
         }))
   };
}

async function ensurePlayerInfo(id: number, playerBlacklist: Set<number>) {
   if (playerBlacklist.has(id)) return;
   const [player] = await getPlayerList([id]);
   if (!player) {
      playerBlacklist.add(id);
      return;
   }
   return {
      original: player,
      working: structuredClone(player)
   };
}

function updatePlayerRating(
   workingPlayer: DbPlayer,
   gamemode: GameMode,
   scores: {
      mapSnapshot: DbBeatmap;
      score: number;
      mods: Mod[];
   }[]
) {
   console.log(workingPlayer._id, "Update player rating from", scores.length, "scores");
   const calculator = new Glicko2();
   const workingPve = workingPlayer[gamemode].pve;
   const playerCalc = calculator.makePlayer(workingPve.rating, workingPve.rd, workingPve.vol);
   const results: [Player, Player, number][] = scores.map(s => [
      playerCalc,
      calculator.makePlayer(s.mapSnapshot.rating.rating, s.mapSnapshot.rating.rd, s.mapSnapshot.rating.vol),
      matchResultValue(s.score, gamemode, {
         mods: s.mods,
         player: workingPlayer[gamemode].mods,
         map: s.mapSnapshot.mods
      })
   ]);
   calculator.updateRatings(results);
   // Update player mods as well
   const modUpdates = getUpdatedModsFromBatch(
      scores.map(s => ({
         map: s.mapSnapshot,
         mode: gamemode,
         player: {
            _id: workingPlayer._id,
            mods: workingPlayer[gamemode].mods,
            rating: workingPve
         },
         score: s
      }))
   );
   // And styles
   const styleUpdates = getUpdatedStylesFromBatch(
      scores.map(s => ({
         map: s.mapSnapshot,
         mode: gamemode,
         player: {
            _id: workingPlayer._id,
            rating: workingPve,
            styles: workingPlayer[gamemode].styles
         },
         score: s.score
      }))
   );
   console.log(
      "Old:",
      workingPlayer[gamemode].styles,
      "New:",
      styleUpdates.players[workingPlayer._id][gamemode]
   );
   // Store results back into the working copy
   workingPve.rating = playerCalc.getRating();
   workingPve.rd = playerCalc.getRd();
   workingPve.vol = playerCalc.getVol();
   workingPlayer[gamemode].mods = {
      ...workingPlayer[gamemode].mods,
      ...(modUpdates.players[workingPlayer._id][gamemode] || {})
   };
   workingPlayer[gamemode].styles =
      styleUpdates.players[workingPlayer._id][gamemode] || workingPlayer[gamemode].styles;
}

function updateMapRating(
   workingMap: DbBeatmap,
   gamemode: GameMode,
   scores: {
      playerSnapshot: DbPlayer;
      score: number;
      mods: Mod[];
   }[]
) {
   console.log(workingMap._id, "Update map rating from", scores.length, "scores");
   const calculator = new Glicko2();
   const mapCalc = calculator.makePlayer(
      workingMap.rating.rating,
      workingMap.rating.rd,
      workingMap.rating.vol
   );
   const results: [Player, Player, number][] = scores.map(s => {
      const pdata = s.playerSnapshot[gamemode].pve;
      return [
         calculator.makePlayer(pdata.rating, pdata.rd, pdata.vol),
         mapCalc,
         matchResultValue(s.score, gamemode, {
            mods: s.mods,
            player: s.playerSnapshot[gamemode].mods,
            map: workingMap.mods
         })
      ];
   });
   calculator.updateRatings(results);
   // Update map mods as well
   const modUpdates = getUpdatedModsFromBatch(
      scores.map(s => ({
         map: workingMap,
         mode: gamemode,
         player: {
            _id: s.playerSnapshot._id,
            mods: s.playerSnapshot[gamemode].mods,
            rating: s.playerSnapshot[gamemode].pve
         },
         score: {
            score: s.score,
            mods: s.mods
         }
      }))
   );
   // And styles
   const styleUpdates = getUpdatedStylesFromBatch(
      scores.map(s => ({
         map: workingMap,
         mode: gamemode,
         player: {
            _id: s.playerSnapshot._id,
            rating: s.playerSnapshot[gamemode].pve,
            styles: s.playerSnapshot[gamemode].styles
         },
         score: s.score
      }))
   );
   console.log("Old:", workingMap.styles, "New:", styleUpdates.maps[workingMap._id][gamemode]);
   // Store results back to the working copy
   workingMap.rating.rating = mapCalc.getRating();
   workingMap.rating.rd = mapCalc.getRd();
   workingMap.rating.vol = mapCalc.getVol();
   workingMap.mods = {
      ...workingMap.mods,
      ...(modUpdates.maps[gamemode][workingMap._id] || {})
   };
   workingMap.styles = styleUpdates.maps[workingMap._id][gamemode] || workingMap.styles;
}

export async function submitPveData(
   lobby: { match: MatchInfo; games: MatchGame[] },
   allowIncomplete = false
) {
   console.log(`Submit PvE lobby ${lobby.match.id}`);
   // Most recent map ratings
   const maps: Record<GameMode, DbBeatmap[]> = {
      osu: [],
      fruits: [],
      taiko: [],
      mania: []
   };
   const players: {
      [id: number]: {
         working: DbPlayer;
         original: DbPlayer;
      };
   } = {};
   const playerBlacklist = new Set<number>();
   const bufferedPlayerResults: Record<
      GameMode,
      {
         [id: number]: {
            mapSnapshot: DbBeatmap;
            score: number;
            mods: Mod[];
         }[];
      }
   > = {
      osu: {},
      fruits: {},
      taiko: {},
      mania: {}
   };
   const playerHistory: {
      [playerId: number]: {
         [mode in GameMode]?: {
            mp: number;
            prevRating: number;
            songs: MatchHistorySong[];
         };
      };
   } = {};
   const practicePoolUpdates: {
      player: number;
      mode: GameMode;
      map: number;
      mods: Mod[];
      score: number;
   }[] = [];
   try {
      console.log(`${lobby.games.length} songs played`);
      console.log(`Finished ${lobby.match.end_time}`);
      if (!allowIncomplete && !lobby.match.end_time) return;
      if (lobby.games.length < 1) return;

      Object.assign(maps, await fetchMaplist(lobby.games));

      for (const game of lobby.games) {
         const { workingMap, scores } = validateGame(game, maps) || {};
         if (!workingMap) continue;
         const scoreBuffer = bufferedPlayerResults[game.mode];
         // Keep the current map rating, and update map results
         const mapResultsList: {
            playerSnapshot: DbPlayer;
            score: number;
            mods: Mod[];
         }[] = [];
         // Add results to the player lists
         for (const playerResult of scores) {
            const playerId = playerResult.user;
            if (!(playerId in scoreBuffer)) scoreBuffer[playerId] = [];
            if (!(playerId in players)) players[playerId] = await ensurePlayerInfo(playerId, playerBlacklist);
            if (!players[playerId]) continue; // Player is blacklisted
            // Set up the player's history if they haven't been seen yet
            if (!(playerId in playerHistory)) playerHistory[playerId] = {};
            // Ensure the player's history for this gamemode exists
            if (!(game.mode in playerHistory[playerId]))
               playerHistory[playerId][game.mode] = {
                  mp: lobby.match.id,
                  prevRating: players[playerId].original[game.mode].pve.rating,
                  songs: []
               };
            // Push this song to the player's history
            playerHistory[playerId][game.mode].songs.push({
               map: {
                  id: workingMap._id,
                  setid: workingMap.setid,
                  version: workingMap.version
               },
               mods: getModsEnum(playerResult.mods, true),
               score: playerResult.score.getScore()
            });
            practicePoolUpdates.push({
               map: workingMap._id,
               mode: game.mode,
               mods: playerResult.mods,
               player: playerId,
               score: playerResult.score.getScore()
            });
            // Add the result to the appropriate score buffers
            const playerScoreList = scoreBuffer[playerId];
            playerScoreList.push({
               mapSnapshot: structuredClone(workingMap),
               mods: playerResult.mods,
               score: playerResult.score.getScore()
            });
            mapResultsList.push({
               playerSnapshot: structuredClone(players[playerId].working),
               score: playerResult.score.getScore(),
               mods: playerResult.mods
            });
            if (playerScoreList.length >= 5) {
               updatePlayerRating(players[playerId].working, game.mode, playerScoreList);
               scoreBuffer[playerId] = [];
            }
         }
         // Update the map rating
         if (mapResultsList.length > 0) updateMapRating(workingMap, game.mode, mapResultsList);
      }
      // Once the lobby is finished, update the remaining player results
      for (const mode of Object.keys(bufferedPlayerResults) as GameMode[])
         for (const [playerIdStr, resultList] of Object.entries(bufferedPlayerResults[mode])) {
            if (resultList.length > 0) {
               const playerId = parseInt(playerIdStr);
               updatePlayerRating(players[playerId].working, mode, resultList);
            }
         }
   } catch (err) {
      console.error("Failure during rating updates");
      console.error(err);
      return;
   }
   // Save results to db
   await updatePlayers(players, playerHistory);
   await updateMaps(maps);
   await updateTeamScoreHistory(practicePoolUpdates);
   return true;
}

async function updatePlayers(
   players: {
      [id: number]: {
         working: DbPlayer;
         original: DbPlayer;
      };
   },
   playerHistory: {
      [playerId: number]: {
         [mode in GameMode]?: {
            mp: number;
            prevRating: number;
            songs: MatchHistorySong[];
         };
      };
   }
) {
   const playerOps: { updateOne: UpdateOneModel<DbPlayer> }[] = [];
   // Use the history object as a determinant. Only played modes should appear in a player's history
   for (const playerIdStr of Object.keys(playerHistory)) {
      const playerId = parseInt(playerIdStr);
      const { original, working } = players[playerId];
      const update = { $set: {}, $inc: {}, $push: {} };
      for (const [mode, history] of Object.entries(playerHistory[playerId])) {
         const o = original[mode as GameMode];
         const w = working[mode as GameMode];
         // Rating
         update.$set[`${mode}.pve.rating`] = w.pve.rating;
         update.$set[`${mode}.pve.rd`] = w.pve.rd;
         update.$set[`${mode}.pve.vol`] = w.pve.vol;
         // Mods
         for (const [mod, val] of Object.entries(w.mods))
            if (o.mods[mod as Mod] !== val) update.$set[`${mode}.mods.${mod}`] = val;
         // History
         update.$set[`${mode}.pve.lastPlayed`] = new Date();
         update.$inc[`${mode}.pve.games`] = 1;
         update.$inc[`${mode}.pve.songs`] = history.songs.length;
         update.$push[`${mode}.pve.matches`] = {
            $each: [
               {
                  ...history,
                  ratingDiff: w.pve.rating - history.prevRating
               }
            ],
            $position: 0,
            $slice: 5
         };
      }

      playerOps.push({
         updateOne: {
            filter: { _id: working._id },
            update
         }
      });
   }

   if (playerOps.length > 0) {
      const result = await playersDb.bulkWrite(playerOps);
      console.log("Players", result);
   } else console.warn("No player updates to perform");
}

async function updateMaps(maps: Record<GameMode, DbBeatmap[]>) {
   for (const mode of ALL_MODES) {
      const mapOps: { updateOne: UpdateOneModel<DbBeatmap> }[] = [];

      for (const working of maps[mode]) {
         const update: UpdateFilter<DbBeatmap> = {
            $set: {
               rating: working.rating,
               mods: working.mods
            }
         };
         mapOps.push({
            updateOne: {
               filter: { _id: working._id },
               update
            }
         });
      }

      if (mapOps.length > 0) {
         const result = await mapsDb[mode].bulkWrite(mapOps);
         console.log(mode, "maps", result);
      } else console.warn(mode, "No maps to update");
   }
}
