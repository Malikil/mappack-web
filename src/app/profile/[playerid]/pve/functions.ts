import { mapsDb, playersDb } from "@/app/api/db/connection";
import { getMaplist } from "@/helpers/server/currentPack";
import { matchResultValue } from "@/helpers/rating-range";
import { ScoreParser } from "@/helpers/scorev1";
import { DbBeatmap } from "@/types/database.beatmap";
import { DbPlayer, MatchHistory } from "@/types/database.player";
import { PveLobbyResults } from "@/types/multiplayer";
import { ModPool, Rating } from "@/types/rating";
import { Glicko2, Player } from "glicko2";
import { UpdateFilter } from "mongodb";
import { GameMode, getModsEnum, LegacyClient, Mod } from "osu-web.js";
import { getUpdatedModsFromBatch, predictOutcome } from "@/helpers/server/ratings";
import { getPlayerList } from "@/helpers/server/players";

const MAP_STYLE_LEARNING_RATE = 0.001;
const STYLES_LEARNING_RATE = 0.01;
const STYLES_REGULARIZATION = 0.1;

export function parseModpool(mods: Mod[], mode: GameMode): ModPool {
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
export function ignoreSongMods(lobbyMods: Mod[], scoreMods: Mod[] = []): Mod[] {
   // When freemod is set on DT, DT will be in both arrays
   // Just take unique mods in general
   const ignore: Mod[] = ["NF", "MR", "SD", "PF"];
   const mods = [
      ...new Set(
         lobbyMods
            .concat(scoreMods)
            // Ignore NF
            .filter(m => !ignore.includes(m))
      )
   ];
   return mods;
}

export async function parseMpLobby(mp: number, allowIncomplete = false): Promise<PveLobbyResults> {
   const osuClient = new LegacyClient(process.env.OSU_LEGACY_KEY);
   try {
      const mpLobby = await osuClient.getMultiplayerLobby({ mp });
      console.log(`${mpLobby.games.length} songs played`);
      // Only accept finished lobbies
      console.log(`Finished ${mpLobby.match.end_time}`);
      if (!allowIncomplete && !mpLobby.match.end_time) return;

      const maps: Partial<Record<GameMode, Set<number>>> = {};
      const results = await mpLobby.games.reduce(
         (prom, game) =>
            prom.then(async scoreAgg => {
               if (game.end_time && (game.team_type === "Head To Head" || game.team_type === "Team VS")) {
                  const scoreType = game.scoring_type;
                  // Add to master maplist
                  if (!(game.play_mode in maps)) maps[game.play_mode] = new Set();
                  maps[game.play_mode].add(game.beatmap_id);
                  // Add individual player scores
                  for (const score of game.scores) {
                     // If there are at least twice as many misses as good hits, discard the play
                     if (score.countmiss > score.count300 * 2) continue;
                     if (!(score.user_id in scoreAgg)) scoreAgg[score.user_id] = [];
                     const mods = ignoreSongMods(game.mods, score.enabled_mods);
                     scoreAgg[score.user_id].push({
                        map: game.beatmap_id,
                        mods,
                        score: new ScoreParser(score, scoreType, game.play_mode, mods),
                        mode: game.play_mode
                     });
                  }
               }
               return scoreAgg;
            }),
         Promise.resolve(
            {} as {
               [user_id: number]: {
                  map: number;
                  mods: Mod[];
                  score: ScoreParser;
                  mode: GameMode;
               }[];
            }
         )
      );
      return {
         matches: results,
         maps,
         mp
      };
   } catch (err) {
      console.error(err);
   }
}

export async function submitPveData(data: PveLobbyResults) {
   const { matches, maps, mp } = data;
   // Create the rating calculator
   const calculator = new Glicko2();
   const calculatorResults: [Player, Player, number][] = [];
   // Get each player's data
   const playerIds = Object.keys(matches).map(id => parseInt(id));
   const playerList = await getPlayerList(playerIds);

   const playerCalculatorPairs = playerList.map(dbp => {
      const playerCalc: Partial<Record<GameMode, Player>> = {};
      const history: Partial<Record<GameMode, MatchHistory>> = {};
      const styleGradients: Partial<Record<GameMode, number[]>> = {};
      return {
         playerId: dbp._id,
         dbplayer: dbp,
         playerCalc,
         history,
         styleGradients
      };
   });
   const maplist = await Promise.all(
      Object.keys(maps).map(async (mode: GameMode) =>
         (
            await getMaplist(mode, [...maps[mode].values()])
         ).map(map => ({
            map,
            mode,
            mapCalc: calculator.makePlayer(map.rating.rating, map.rating.rd, map.rating.vol),
            styleGradients: Array(parseInt(process.env.SKILL_CATEGORIES)).fill(0) as number[]
         }))
      )
   ).then(modeArr => modeArr.flat());
   console.log(`Got ${maplist.length} maps`);

   // Create matches for all scores and prep the player's history
   const practicePoolUpdates: {
      player: number;
      mode: GameMode;
      map: number;
      mods: Mod[];
      score: number;
   }[] = [];
   const modRatingsUpdateObj: {
      mode: GameMode;
      score: {
         score: number;
         mods: Mod[];
      };
      player: {
         _id: number;
         rating: Rating;
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
   Object.keys(matches).forEach(playerIdStr => {
      const playerId = parseInt(playerIdStr);
      const matchInfo = matches[playerId];
      const playerInfo = playerCalculatorPairs.find(pcp => pcp.playerId === playerId);
      // If there's no player info, we kind of need to just skip them. Situations can be investigated
      // on a case-by-case basis if people are noticing they're missing results.
      if (!playerInfo) return;
      matchInfo.forEach(score => {
         const mapInfo = maplist.find(m => m.map._id === score.map && m.mode === score.mode);
         const playerModeInfo = playerInfo.dbplayer[score.mode];
         // If the map isn't in the list, ignore it
         if (!mapInfo) return;
         // Set the map info on the parser
         score.score.setMap(mapInfo.map);
         // If parsing the score fails, also skip the map
         if (!score.score.getScore()) return;

         // Prep the player's history
         if (!(score.mode in playerInfo.history)) {
            playerInfo.history[score.mode] = {
               mp,
               prevRating: playerModeInfo.pve.rating,
               ratingDiff: 0,
               songs: []
            };
         }
         // Update the history
         playerInfo.history[score.mode].songs.push({
            map: {
               id: mapInfo.map._id,
               setid: mapInfo.map.setid,
               version: mapInfo.map.version
            },
            mods: getModsEnum(score.mods, true),
            score: score.score.getScore()
         });
         // Add to the practice pool update list
         practicePoolUpdates.push({
            player: playerId,
            mode: score.mode,
            map: score.map,
            mods: score.mods,
            score: score.score.getScore()
         });
         // Add to the mods updates list
         modRatingsUpdateObj.push({
            player: {
               _id: playerId,
               mods: playerModeInfo.mods,
               rating: playerModeInfo.pve,
               styles: playerModeInfo.styles
            },
            map: mapInfo.map,
            mode: score.mode,
            score: {
               score: score.score.getScore(),
               mods: score.mods
            }
         });

         // Create a glicko player for this gamemode if it doesn't already exist
         if (!(score.mode in playerInfo.playerCalc)) {
            const pveStats = playerModeInfo.pve;
            playerInfo.playerCalc[score.mode] = calculator.makePlayer(
               pveStats.rating,
               pveStats.rd,
               pveStats.vol
            );
         }

         // Calculate the score result
         const playerModsModifier = score.mods.reduce(
            (mult, mod) => mult * (playerModeInfo.mods[mod] || 1),
            1
         );
         const mapModsModifier = score.mods.reduce((mult, mod) => mult * (mapInfo.map.mods[mod] || 1), 1);
         const modAdjustedScore = score.score.getScore() * playerModsModifier * mapModsModifier;
         const scoreResult = matchResultValue(modAdjustedScore, score.mode);
         calculatorResults.push([playerInfo.playerCalc[score.mode], mapInfo.mapCalc, scoreResult]);

         // To update style weights, get the expected score
         // Update mod multipliers in the same way
         const expectedResult = predictOutcome(
            playerModeInfo.pve,
            mapInfo.map.rating,
            playerModeInfo.styles,
            mapInfo.map.styles
         );
         const error = scoreResult - expectedResult;
         // Make sure the gradients array is available
         if (!(score.mode in playerInfo.styleGradients))
            playerInfo.styleGradients[score.mode] = Array(parseInt(process.env.SKILL_CATEGORIES)).fill(0);

         // Update skills gradients
         const nSkills = parseInt(process.env.SKILL_CATEGORIES);
         for (let i = 0; i < nSkills; i++) {
            // Gradient for player skill comes from sum of errors for each map
            playerInfo.styleGradients[score.mode][i] += error * mapInfo.map.styles[i];
            // Thus, gradient for map requirements should come from errors for each player
            mapInfo.styleGradients[i] -= error * playerModeInfo.styles[i];
         }
      });
      let min = 10;
      let max = -10;
      console.log(
         `${playerInfo.dbplayer.osuname} - Average error: ${
            (Object.values(playerInfo.styleGradients).reduce(
               (p, v) =>
                  p +
                  v.reduce((a, b) => {
                     min = Math.min(min, b);
                     max = Math.max(max, b);
                     return a + b;
                  }),
               0
            ) /
               Object.keys(playerInfo.styleGradients).length) *
            parseInt(process.env.SKILL_CATEGORIES)
         }`
      );
      console.log(`Min gradient: ${min}, Max gradient: ${max}`);
   });

   // Update matches
   console.log(`Update results for ${calculatorResults.length} scores`);
   calculator.updateRatings(calculatorResults);
   const updatedModRatings = getUpdatedModsFromBatch(modRatingsUpdateObj);

   // Save results to database
   // First player practice pools
   const practicePoolDbResult = await playersDb.bulkWrite(
      practicePoolUpdates.map(ppu => {
         const nomod = ppu.mods.length < 1;
         return {
            updateOne: {
               filter: { _id: ppu.player },
               update: {
                  $push: {
                     [`${ppu.mode}.pools.$[pool].maps.$[map].scores`]: ppu.score
                  }
               },
               arrayFilters: [
                  { "pool.maps.id": ppu.map },
                  {
                     "map.id": ppu.map,
                     $or: [
                        { "map.mods": null },
                        { "map.mods": { $exists: false } },
                        nomod
                           ? { "map.mods": { $size: 0 } }
                           : {
                                $and: [
                                   { "map.mods": { $all: ppu.mods } },
                                   { "map.mods": { $size: ppu.mods.length } }
                                ]
                             }
                     ]
                  }
               ]
            }
         };
      })
   );
   console.log("Practice pool results", practicePoolDbResult);
   // Then remaining player info
   const playersDbWriteResult = await playersDb.bulkWrite(
      playerCalculatorPairs
         .map(({ playerId, dbplayer, playerCalc, history, styleGradients }) => {
            const updateFilter: UpdateFilter<DbPlayer> = {
               $set: {},
               $inc: {},
               $push: {}
            };
            const playedModes = Object.keys(playerCalc) as GameMode[];
            if (playedModes.length < 1) return;
            for (const mode of playedModes) {
               // Update the player skills here for this game mode
               updateFilter.$set[`${mode}.styles`] = dbplayer[mode].styles.map(
                  (v, i) => v + STYLES_LEARNING_RATE * (styleGradients[mode][i] - STYLES_REGULARIZATION * v)
               );
               // Update the player mods
               Object.entries(updatedModRatings.players[playerId]?.[mode]).forEach(
                  ([playedMod, multiplier]: [Mod, number]) => {
                     updateFilter.$set[`${mode}.mods.${playedMod}`] = multiplier;
                  }
               );

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
                  filter: { _id: playerId },
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
            .map(({ map, mapCalc, styleGradients }) => {
               // Update the map's styles here
               const updateFilter: UpdateFilter<DbBeatmap> = {
                  $set: {
                     styles: map.styles.map(
                        (v, i) =>
                           v + MAP_STYLE_LEARNING_RATE * (styleGradients[i] - STYLES_REGULARIZATION * v)
                     ),
                     rating: {
                        rating: mapCalc.getRating(),
                        rd: mapCalc.getRd(),
                        vol: mapCalc.getVol()
                     }
                  }
               };
               // Update the map's mods
               Object.entries(updatedModRatings.maps[mode]?.[map._id]).forEach(
                  ([playedMod, multiplier]: [Mod, number]) => {
                     updateFilter.$set[`mods.${playedMod}`] = multiplier;
                  }
               );

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
}
