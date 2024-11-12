"use server";

import db from "@/app/api/db/connection";
import { Glicko2 } from "glicko2";
import { revalidatePath } from "next/cache";
import { matchResultValue } from "../pve/functions";
import { parseMpLobby } from "./functions";

export async function submitPvp(formData) {
   let winnerId = formData.get("winner");
   let loserId = formData.get("loser");
   let formMaplist = [];
   /** @type {[number,string][]} */
   let winnerScores = [];
   /** @type {[number,string][]} */
   let loserScores = [];
   const mp = formData.get("mp");
   if (mp) {
      const matchData = await parseMpLobby(mp);
      console.log(matchData);
      winnerId = matchData.winScores[0].osuid;
      loserId = matchData.loseScores[0].osuid;
      formMaplist = matchData.maps;
      winnerScores = matchData.winScores.map(item => [item.score, item.mod]);
      loserScores = matchData.loseScores.map(item => [item.score, item.mod]);
   } else {
      formMaplist = formData
         .get("songs")
         .split("\n")
         .map(item => {
            const [map, mod] = item.split("+");
            const id = parseInt(map);
            return {
               map: id,
               mod: mod.trim().toLowerCase()
            };
         });
      winnerScores = formData
         .get("winnerScores")
         .split("\n")
         .map(s => {
            const sp = s.split("+");
            sp[0] = parseInt(sp[0]);
            if (sp[1]) sp[1] = sp[1].trim().toLowerCase();
            return sp;
         });
      loserScores = formData
         .get("loserScores")
         .split("\n")
         .map(s => {
            const sp = s.split("+");
            sp[0] = parseInt(sp[0]);
            if (sp[1]) sp[1] = sp[1].trim().toLowerCase();
            return sp;
         });
   }

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
   const mappack = await mapsDb.findOne({ active: "current" });
   /** @type {{map: { id: number, setid: number, version: string }, mod: 'nm'|'hd'|'hr'|'dt'|'fm'}[]} */
   const playedMaps = formMaplist.map(item => {
      const { map, mod } = item;
      const dbmap = mappack.maps.find(m => m.id === map);
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
                        playedMaps.map((m, i) => ({
                           ...m,
                           score: winnerScores[i][0],
                           opponentScore: loserScores[i][0]
                        }))
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
                        playedMaps.map((m, i) => ({
                           ...m,
                           score: loserScores[i][0],
                           opponentScore: winnerScores[i][0]
                        }))
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
      const map = mappack.maps.find(map => map.id === result.map.id);
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
                  active: "current",
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

   revalidatePath("/profile");
}
