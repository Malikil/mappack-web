import { createMappool, cyclePools } from "@/helpers/addPool";
import { NextRequest, NextResponse } from "next/server";
import { Client } from "osu-web.js";

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
      // cache: "no-store" // TODO Investigate if this will be needed in production
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
   console.log(packs.beatmap_packs[0], `+ ${packs.beatmap_packs.length - 1} more`);
   const mappackMeta = packs.beatmap_packs.find(p => !p.ruleset_id);
   console.log(`Found mappack ${mappackMeta.tag}`);
   /** @type {import("@/types/undocumented.beatmappacks").UndocumentedBeatmappack} */
   const mappack = await client.getUndocumented(`beatmaps/packs/${mappackMeta.tag}`);
   console.log(`Add mappack ${mappack.tag}`);
   return await createMappool(
      accessToken,
      mappack.name,
      mappack.url,
      mappack.beatmapsets.map(bms => bms.id)
   )
      .then(cyclePools)
      .then(() => new NextResponse("OK"))
      .catch(err => {
         console.warn(err);
         if (err.message == "409")
            return new NextResponse("Pack has already been used", { status: 409 });
         else return new NextResponse("Error", { status: 500 });
      });
}
