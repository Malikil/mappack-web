"use server";

import { LegacyClient } from "osu-web.js";
import db from "../api/db/connection";
import { convertPP } from "@/helpers/rating-range";

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
