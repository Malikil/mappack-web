"use server";

import db from "../api/db/connection";
import { redirect } from "next/navigation";

export async function register(osuid, osuname) {
   console.log(`Register player ${osuid}`);
   const collection = db.collection("players");
   await collection.updateOne(
      { osuid },
      {
         $set: {
            osuname,
            pvp: {
               rating: 1500,
               rd: 350,
               vol: 0.06,
               matches: [],
               wins: 0,
               losses: 0
            },
            pve: {
               rating: 1500,
               rd: 350,
               vol: 0.06,
               matches: [],
               games: 0
            },
            $unset: { hideLeaderboard: "" }
         }
      },
      { upsert: true }
   );
}

export async function getOpponentMappool(userid, formData) {
   const opp = formData.get("opponent");
   const playersDb = db.collection("players");
   const opponent = await playersDb.findOne({
      $or: [{ osuid: parseInt(opp) }, { osuname: opp }]
   });
   return redirect(`/mappool/${userid}/${opponent?.osuid || ""}`);
}
