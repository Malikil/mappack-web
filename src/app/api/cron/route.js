import { createMappool } from "@/helpers/addPool";
import { NextRequest, NextResponse } from "next/server";
import { Client } from "osu-web.js";
import db from "../db/connection";

async function getOsuToken() {
   console.log("Get osu token");
   const url = new URL("https://osu.ppy.sh/oauth/token");
   const headers = {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
   };
   const body = `client_id=${process.env.AUTH_OSU_ID}&client_secret=${process.env.AUTH_OSU_SECRET}&grant_type=client_credentials&scope=public`;
   const osuResponse = await fetch(url, {
      method: "POST",
      headers,
      body
   }).then(res => res.json());
   return osuResponse.access_token;
}

/**
 * @param {NextRequest} req
 */
export async function GET(req) {
   if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`)
      return new NextResponse("Unauthorized", { status: 401 });

   // Get recent beatmap packs
   const accessToken = await getOsuToken();
   const client = new Client(accessToken);
   /** @type {import("@/types/undocumented.beatmappacks").UndocumentedBeatmappackResponse} */
   const packs = await client.getUndocumented("beatmaps/packs");
   const mappackMeta = packs.beatmap_packs.find(p => !p.ruleset_id);
   /** @type {import("@/types/undocumented.beatmappacks").UndocumentedBeatmappack} */
   const mappack = await client.getUndocumented(`beatmaps/packs/${mappackMeta.tag}`);
   console.log(`Add mappack ${mappack.tag}`);
   await createMappool(
      accessToken,
      mappack.name,
      mappack.url,
      mappack.beatmapsets.map(bms => bms.id)
   ).then(
      async () => {
         // Advance all mappacks
         const collection = db.collection("maps");
         if (!(await collection.findOne({ active: "pending" })))
            return console.log("No pending pool available");

         const result = await collection.bulkWrite([
            {
               deleteMany: {
                  filter: { active: "stale" }
               }
            },
            {
               updateMany: {
                  filter: { active: "completed" },
                  update: { $set: { active: "stale" } }
               }
            },
            {
               updateMany: {
                  filter: { active: "current" },
                  update: { $set: { active: "completed" } }
               }
            },
            {
               updateMany: {
                  filter: { active: "pending" },
                  update: { $set: { active: "current" } }
               }
            }
         ]);
         console.log(result);
      },
      res => console.warn(res)
   );

   return new NextResponse("OK");
}
