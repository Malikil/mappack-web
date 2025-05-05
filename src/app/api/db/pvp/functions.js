import { Glicko2 } from "glicko2";
import { LegacyClient } from "osu-web.js";
import db from "../connection";
import { matchResultValue } from "@/app/profile/pve/functions";
import { getCurrentPack } from "@/helpers/currentPack";

/**
 * @typedef SongResultMap
 * @prop {number} map
 * @prop {'nm'|'hd'|'hr'|'dt'|'fm'} mod
 */
/**
 * @typedef MpLobbyResults
 * @prop {number} mp
 * @prop {SongResultMap[]} maps
 * @prop {[number, 'hd'|'hr'|'hdhr'|null][]} winnerScores
 * @prop {[number, 'hd'|'hr'|'hdhr'|null][]} loserScores
 * @prop {number} winnerId
 * @prop {number} loserId
 */

/**
 * @param {string} link
 * @returns {Promise<MpLobbyResults>}
 */
export async function parseMpLobby(link) {
   const osuClient = new LegacyClient(process.env.OSU_LEGACY_KEY);
   const matchIdSegment = link.slice(link.lastIndexOf("/") + 1);
   try {
      console.log(`Fetch multiplayer lobby ${matchIdSegment}`);
      const mpLobby = await osuClient.getMultiplayerLobby({ mp: matchIdSegment });
      // Is end time an indicator of aborted matches?
      const result = mpLobby.games
         .filter(l => l.end_time)
         .reduce(
            (agg, game) => {
               // If length is 0, that means freemod is enabled. Length will be 1 if nomod (nf counts as the 1)
               const mod =
                  game.mods.length === 0
                     ? "fm"
                     : (game.mods.filter(v => v !== "NF")[0] || "nm").toLowerCase();
               agg.maps.push({
                  map: game.beatmap_id,
                  mod
               });
               game.scores.forEach(score => {
                  // Will HD always be first?
                  const scoreMod = score.enabled_mods
                     .filter(v => v !== "NF")
                     .join("")
                     .toLowerCase();
                  if (!(score.user_id in agg.scores)) agg.scores[score.user_id] = [];
                  agg.scores[score.user_id].push({
                     osuid: score.user_id,
                     score: score.score,
                     mod: ["hd", "hr", "hdhr"].includes(scoreMod) ? scoreMod : null
                  });
               });
               // Find the song winner
               const winner = game.scores.sort((a, b) => b.score - a.score)[0].user_id;
               agg.resultScore[winner] = (agg.resultScore[winner] || 0) + 1;
               // Make sure the loser is still counted
               agg.resultScore[game.scores[1].user_id] =
                  agg.resultScore[game.scores[1].user_id] || 0;
               return agg;
            },
            { maps: [], scores: {}, resultScore: {} }
         );
      const matchPlacement = Object.keys(result.resultScore).sort(
         (a, b) => result.resultScore[b] - result.resultScore[a]
      );
      console.log(result);
      return {
         mp: parseInt(matchIdSegment),
         maps: result.maps,
         winnerScores: result.scores[matchPlacement[0]].map(item => [item.score, item.mod]),
         loserScores: result.scores[matchPlacement[1]].map(item => [item.score, item.mod]),
         winnerId: result.scores[matchPlacement[0]][0].osuid,
         loserId: result.scores[matchPlacement[1]][0].osuid
      };
   } catch (err) {
      console.error(err);
   }
}

/**
 * @param {MpLobbyResults} arg0
 */
export async function addMatchData({ mp, winnerId, loserId, maps, winnerScores, loserScores }) {
   console.log(winnerScores, loserScores);
   const playersDb = db.collection("players");
   const winner = await playersDb.findOne({
      $or: [{ osuid: parseInt(winnerId) }, { osuname: winnerId }]
   });
   const loser = await playersDb.findOne({
      $or: [{ osuid: parseInt(loserId) }, { osuname: loserId }]
   });
   console.log(winner, loser);
   // Get the played maps
   const mapsDb = db.collection("maps");
   const maplist = await getCurrentPack();
   const staleMaplist = await db.collection('maps').findOne({ active: 'completed' });
   const playedMaps = maps.map(item => {
      const { map, mod } = item;
      /** @type {import("@/types/database.beatmap").DbBeatmap} */
      const dbmap = maplist.find(m => m.id === map) || staleMaplist.maps.find(m => m.id === map);
      return {
         map: {
            id: dbmap.id,
            setid: dbmap.setid,
            version: dbmap.version
         },
         mod
      };
   });

   // Create the rating calculator
   const calculator = new Glicko2();
   const winnerPlayer = calculator.makePlayer(winner.pvp.rating, winner.pvp.rd, winner.pvp.vol);
   const loserPlayer = calculator.makePlayer(loser.pvp.rating, loser.pvp.rd, loser.pvp.vol);
   // Update player ratings
   calculator.updateRatings([[winnerPlayer, loserPlayer, 1]]);
   const playerUpdateResult = await playersDb.bulkWrite([
      {
         updateOne: {
            filter: { _id: winner._id },
            update: {
               $set: {
                  "pvp.rating": winnerPlayer.getRating(),
                  "pvp.rd": winnerPlayer.getRd(),
                  "pvp.vol": winnerPlayer.getVol()
               },
               $inc: { "pvp.wins": 1 },
               $push: {
                  "pvp.matches": {
                     $each: [
                        {
                           mp,
                           prevRating: winner.pvp.rating,
                           ratingDiff: winnerPlayer.getRating() - winner.pvp.rating,
                           opponent: { name: loser.osuname, rating: loser.pvp.rating },
                           songs: playedMaps.map((m, i) => ({
                              ...m,
                              score: winnerScores[i][0],
                              opponentScore: loserScores[i][0]
                           }))
                        }
                     ],
                     $position: 0,
                     $slice: 5
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
                  "pvp.rating": loserPlayer.getRating(),
                  "pvp.rd": loserPlayer.getRd(),
                  "pvp.vol": loserPlayer.getVol()
               },
               $inc: { "pvp.losses": 1 },
               $push: {
                  "pvp.matches": {
                     $each: [
                        {
                           mp,
                           prevRating: loser.pvp.rating,
                           ratingDiff: loserPlayer.getRating() - loser.pvp.rating,
                           opponent: { name: winner.osuname, rating: winner.pvp.rating },
                           songs: playedMaps.map((m, i) => ({
                              ...m,
                              score: loserScores[i][0],
                              opponentScore: winnerScores[i][0]
                           }))
                        }
                     ],
                     $position: 0,
                     $slice: 5
                  }
               }
            }
         }
      }
   ]);
   console.log(playerUpdateResult);

   // Update map ratings
   const songlistCombined = playedMaps.flatMap((result, i) => {
      const map = maplist.find(map => map.id === result.map.id);
      // If the map isn't in the maplist, skip it
      // This could be because the pool has rotated since the match started
      if (!map) return [];

      const wscore = winnerScores[i][0];
      const lscore = loserScores[i][0];
      if (result.mod === "fm") {
         const wmod = winnerScores[i][1];
         const lmod = loserScores[i][1];
         // If they used the same mods, treat it like a map from a specific modpool
         // If they both used HDHR the map can be skipped entirely
         if (wmod === lmod)
            if (wmod === "hdhr") return [];
            else {
               const r = map.ratings[wmod];
               const resultObj = {
                  ...result,
                  calc: calculator.makePlayer(r.rating, r.rd, r.vol),
                  mod: wmod
               };
               return [
                  { ...resultObj, score: wscore, player: winnerPlayer },
                  { ...resultObj, score: lscore, player: loserPlayer }
               ];
            }
         else {
            // They used different mods, handle each individually
            const resultArr = [];
            if (wmod !== "hdhr") {
               const r = map.ratings[wmod];
               resultArr.push({
                  ...result,
                  mod: wmod,
                  calc: calculator.makePlayer(r.rating, r.rd, r.vol),
                  score: wscore,
                  player: winnerPlayer
               });
            }
            if (lmod !== "hdhr") {
               const r = map.ratings[lmod];
               resultArr.push({
                  ...result,
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
         const r = map.ratings[result.mod];
         const resultObj = { ...result, calc: calculator.makePlayer(r.rating, r.rd, r.vol) };
         return [
            { ...resultObj, score: wscore, player: winnerPlayer },
            { ...resultObj, score: lscore, player: loserPlayer }
         ];
      }
   });

   const calculatorMatches = songlistCombined.map(result => [
      result.player,
      result.calc,
      matchResultValue(result.score)
   ]);
   calculator.updateRatings(calculatorMatches);

   // Update song ratings in database
   const uniqueMaps = songlistCombined.reduce((unique, candidate) => {
      if (!unique.find(m => m.map.id === candidate.map.id && m.mod === candidate.mod))
         unique.push(candidate);
      return unique;
   }, []);
   const mapsResult = await mapsDb.bulkWrite(
      uniqueMaps.map(outcome => {
         const ratingField = `maps.$.ratings.${outcome.mod}`;
         const updatedRating = {
            rating: outcome.calc.getRating(),
            rd: outcome.calc.getRd(),
            vol: outcome.calc.getVol()
         };
         return {
            updateOne: {
               filter: {
                  $or: [{ active: "fresh" }, { active: "stale" }],
                  "maps.id": outcome.map.id
               },
               update: {
                  $set: {
                     [ratingField]: updatedRating
                  }
               }
            }
         };
      })
   );
   console.log(mapsResult);
}
