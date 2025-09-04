import { mapsDb, playersDb } from "@/app/api/db/connection";
import { getMaplist } from "@/helpers/server/currentPack";
import { batchArray } from "@/helpers/list-splitter";
import { getOsuToken } from "@/helpers/osuToken";
import { matchResultValue } from "@/helpers/rating-range";
import { ScoreParser } from "@/helpers/scorev1";
import { delay, seconds } from "@/time";
import { DbBeatmap } from "@/types/database.beatmap";
import { DbPlayer, ModeInfo, PvEMatchHistory } from "@/types/database.player";
import { PveLobbyResults } from "@/types/multiplayer";
import { SimpleMod } from "@/types/rating";
import { Glicko2, Player } from "glicko2";
import { UpdateFilter } from "mongodb";
import { Client, GameMode, LegacyClient, Mod } from "osu-web.js";
import { predictOutcome } from "@/helpers/server/predictor";

const MAP_STYLE_LEARNING_RATE = 0.001;
const STYLES_LEARNING_RATE = 0.01;
const STYLES_REGULARIZATION = 0.1;

function parseSongMods(lobbyMods: Mod[], scoreMods: Mod[], mode: GameMode): SimpleMod {
   // When freemod is set on DT, DT will be in both arrays
   // Just take unique mods in general
   const ignore: Mod[] = ["NF", "MR", "FI", "SD", "PF", "FL"];
   const mods = [
      ...new Set(
         lobbyMods
            .concat(scoreMods)
            // Ignore NF
            .filter(m => !ignore.includes(m))
      )
   ];
   // In order for the score to be valid, only one mod should be used
   if (mods.length > 1) return null;
   if (mods.length === 0) return "nm";
   else if (mode === "mania") {
      if (mods[0] === "DT" || mods[0] === "NC") return "dt";
      // Only reject EZ and HT
      if (mods[0] === "EZ" || mods[0] === "HT") return null;
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
                     const scoreResult = {
                        map: game.beatmap_id,
                        mod: parseSongMods(game.mods, score.enabled_mods, game.play_mode),
                        score: new ScoreParser(score, scoreType, game.play_mode),
                        mode: game.play_mode
                     };
                     if (scoreResult.mod && scoreResult.score) {
                        if (!(score.user_id in scoreAgg)) scoreAgg[score.user_id] = [];
                        scoreAgg[score.user_id].push(scoreResult);
                     }
                  }
               }
               return scoreAgg;
            }),
         Promise.resolve(
            {} as {
               [user_id: number]: {
                  map: number;
                  mod: SimpleMod;
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

export async function submitPveData(
   data: PveLobbyResults | (Omit<PveLobbyResults, "mp"> & { mp: { [user: number]: number } })
) {
   const { matches, maps, mp } = data;
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
            },
            styles: Array.from({ length: parseInt(process.env.SKILL_CATEGORIES) }, () => Math.random() / 100)
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
         const iteration = ((addingUsers.length / 50) | 0) % 4;
         if (!iteration) {
            const n = addingUsers.length / 200;
            const s = Math.min(((n * (n + 1)) / 2) | 0, 20);
            console.log(`Cool down! ${s.toFixed(1)} seconds`);
            await delay(seconds(s));
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
      if (panic) throw new Error("Failed to fetch players");
   }

   const playerCalculatorPairs = playerList.map(dbp => {
      const playerCalc: Partial<Record<GameMode, Player>> = {};
      const history: Partial<Record<GameMode, PvEMatchHistory>> = {};
      const styleGradients: Partial<Record<GameMode, number[]>> = {};
      return {
         playerId: dbp.osuid,
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
            ratings: {} as Partial<Record<SimpleMod, Player>>,
            styleGradients: Array(parseInt(process.env.SKILL_CATEGORIES)).fill(0) as number[]
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
         const playerModeInfo = playerInfo.dbplayer[score.mode];
         // If the map isn't in the list, ignore it
         if (!mapInfo) return;
         // Set the map info on the parser
         score.score.setMap(mapInfo.map);
         // If parsing the score fails, also skip the map
         if (!score.score.getScore()) return;

         // Prep the player's history
         if (!(score.mode in playerInfo.history)) {
            let playersMp = mp;
            if (typeof mp !== "number") playersMp = mp[playerId];
            playerInfo.history[score.mode] = {
               mp: playersMp as number,
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
            mod: score.mod,
            score: score.score.getScore()
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
         // Create a glicko player for the selected mod if it doesn't already exist
         if (!(score.mod in mapInfo.ratings)) {
            const mapStats = mapInfo.map.ratings[score.mod];
            mapInfo.ratings[score.mod] = calculator.makePlayer(mapStats.rating, mapStats.rd, mapStats.vol);
         }

         // Calculate the score result
         const scoreResult = matchResultValue(score.score.getScore(), score.mode);
         calculatorResults.push([playerInfo.playerCalc[score.mode], mapInfo.ratings[score.mod], scoreResult]);

         // To update style weights, get the expected score
         const expectedResult = predictOutcome(
            playerModeInfo.pve,
            mapInfo.map.ratings[score.mod],
            playerModeInfo.styles,
            mapInfo.map.styles
         );
         const error = scoreResult - expectedResult;
         // Make sure the gradients array is available
         if (!(score.mode in playerInfo.styleGradients))
            playerInfo.styleGradients[score.mode] = Array(parseInt(process.env.SKILL_CATEGORIES)).fill(0);

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

   // Save results to database
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
            .map(({ map, ratings, styleGradients }) => {
               // Update the map's styles here
               const updateFilter: UpdateFilter<DbBeatmap> = {
                  $set: {
                     styles: map.styles.map(
                        (v, i) =>
                           v + MAP_STYLE_LEARNING_RATE * (styleGradients[i] - STYLES_REGULARIZATION * v)
                     )
                  }
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
}
