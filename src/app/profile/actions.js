"use server";

import { LegacyClient } from "osu-web.js";
import db from "../api/db/connection";
import { redirect } from "next/navigation";

const PP_EQUIVALENT = 9001;

const convertPP = pp => {
   // Below 1000 PP, rating == pp
   if (pp < 1000) return pp;
   // Between 1000 and 10k rank (pp value), linearly scale so 10k == 2000 rating
   else if (pp < PP_EQUIVALENT) return 1000 * ((pp - 1000) / (PP_EQUIVALENT - 1000) + 1);
   // Afterwards logarithmically scale up from 2000 rating
   else return 1000 * (Math.log(pp / 1000) / Math.log(PP_EQUIVALENT / 1000) + 1);
};

export async function register(osuid, osuname) {
   console.log(`Register player ${osuid}`);
   // Get osu! player info
   const osuApi = new LegacyClient(process.env.OSU_LEGACY_KEY);
   const osuPlayer = await osuApi.getUser({ u: osuid });
   const collection = db.collection("players");
   await collection.updateOne(
      { osuid },
      {
         $set: {
            osuname,
            pvp: {
               rating: convertPP(osuPlayer.pp_raw),
               rd: 175, // Glicko default 350
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
            }
         },
         $unset: { hideLeaderboard: "" }
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
