"use server";

import db from "@/app/api/db/connection";
import { Glicko2 } from "glicko2";
import { revalidatePath } from "next/cache";

export async function submitPvp(formData) {
   const playersDb = db.collection("players");
   const winner = await playersDb.findOne({
      $or: [{ osuid: parseInt(formData.get("winner")) }, { osuname: formData.get("winner") }]
   });
   const loser = await playersDb.findOne({
      $or: [{ osuid: parseInt(formData.get("loser")) }, { osuname: formData.get("loser") }]
   });
   console.log(winner, loser);
   // Get the played maps
   /** @type {{map: number, mod: 'nm'|'hd'|'hr'|'dt'|'fm'}[]} */
   const playedMaps = formData
      .get("songs")
      .split("\n")
      .map(item => {
         const [map, mod] = item.split("+");
         return {
            map: parseInt(map),
            mod
         };
      });
   /** @type {number[]} */
   const winnerScores = formData
      .get("winnerScores")
      .split("\n")
      .map(s => parseInt(s));
   /** @type {number[]} */
   const loserScores = formData
      .get("loserScores")
      .split("\n")
      .map(s => parseInt(s));

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
                           score: winnerScores[i],
                           opponentScore: loserScores[i]
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
                           score: loserScores[i],
                           opponentScore: winnerScores[i]
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
   const mapsDb = db.collection("maps");
   const mappack = await mapsDb.findOne({ active: "current" });
   const songlistPlayers = playedMaps.map(result => {
      const rating = mappack.maps.find(map => map.id === result.map).ratings[result.mod];
   });

   //revalidatePath("/profile");
}
