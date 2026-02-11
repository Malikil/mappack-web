"use server";

import { playersDb } from "@/app/api/db/connection";
import { auth } from "@/auth";
import { Rating } from "@/types/rating";

export async function fetchPlayerList(players: (number | string)[]): Promise<Rating> {
   const session = await auth();
   const mode = session ? (await playersDb.findOne({ _id: session.user.id }))?.gamemode || "osu" : "osu";
   const ids: number[] = [];
   const names: string[] = [];
   for (const p of players)
      if (typeof p === "string") names.push(p);
      else ids.push(p);
   const playerList = playersDb.find({ $or: [{ _id: { $in: ids } }, { osuname: { $in: names } }] });
   const ratingList = await playerList.map(p => p[mode].pvp || p[mode].pve).toArray();
   console.log(`Combine ratings from ${ratingList.length} players`);
   ratingList.sort((a, b) => b.rating - a.rating);
   console.log("Max:", ratingList[0].rating.toFixed(), " Min:", ratingList.slice(-1)[0].rating.toFixed());
   // Custom combine, average should be weighted to divide by sqrt of index when sorted
   const combined = ratingList.reduce(
      (agg, c, i) => {
         //const round = Math.floor(Math.log2(i + 1));
         const weight = 1 / Math.sqrt(i + 1); //(1 << round);
         return {
            sum: agg.sum + c.rating * weight,
            weightedN: agg.weightedN + weight,
            rvar: agg.rvar + c.rd * c.rd
         };
      },
      { sum: 0, weightedN: 0, rvar: 0 }
   );
   console.log(combined);
   return {
      rating: combined.sum / combined.weightedN,
      rd: Math.sqrt(combined.rvar)
   };
}
