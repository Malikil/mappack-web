import { createMappool, cyclePools } from "@/helpers/addPool";
import { NextRequest, NextResponse } from "next/server";
import { Client } from "osu-web.js";
import db from "../db/connection";
import { days } from "@/time";

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
 * @param {import("@/types/undocumented.beatmappacks").UndocumentedBeatmappackCompact[]} packList
 * @param {import("osu-web.js").GameMode} mode
 */
async function findMappackTag(packList, mode) {
   const history = await db.collection("history").findOne({ mode });
   const modeMapping = {
      osu: null,
      taiko: 1,
      fruits: 2,
      mania: 3
   };
   // Find the latest pack first
   const pack = packList.find(p => p.ruleset_id == modeMapping[mode]);
   if (history?.packs.includes(pack.name)) {
      // Find the highest number that's not on history
      const numberIndex = pack.name.lastIndexOf("#");
      let i = parseInt(pack.name.slice(numberIndex + 1)) - 1;
      while (history.packs.includes(`${pack.name.slice(0, numberIndex)}#${i}`)) i--;
      // Construct the appropriate tag
      const modeTag = {
         osu: "",
         taiko: "T",
         fruits: "C",
         mania: "M"
      };
      return `S${modeTag[mode]}${i}`;
   } else return pack.tag;
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
   console.log(packs.beatmap_packs.slice(0, 3), `+ ${packs.beatmap_packs.length - 3} more`);
   /** @type {import("osu-web.js").GameMode[]} */
   const modesToFetch = ["osu"];
   // On even weeks, fetch a ctb pool. On odd weeks, duplicate the std pool into ctb
   // Take the integer component after dividing the day-of-year by 7. That way even if the cron job
   // was delayed enough to technically roll over to Tuesday, the even/odd is still preserved
   const now = new Date();
   const yearBegin = new Date(now.getFullYear(), 0, 1);
   // On the first week of each calendar year this may result in a duplication. But that's fine
   const alsoFruits = !!((((now - yearBegin) / days(7)) | 0) % 2);
   if (!alsoFruits) modesToFetch.push("fruits");

   await modesToFetch.reduce(
      (wait, mode) =>
         wait.then(async () => {
            const mappackTag = await findMappackTag(packs.beatmap_packs, mode);
            console.log(`Found mappack ${mappackTag}`);
            /** @type {import("@/types/undocumented.beatmappacks").UndocumentedBeatmappack} */
            const mappack = await client.getUndocumented(`beatmaps/packs/${mappackTag}`);
            console.log(`Add mappack ${mappack.tag}`);
            await createMappool(
               accessToken,
               mappack.name,
               mappack.url,
               mappack.beatmapsets.map(bms => bms.id),
               mode,
               alsoFruits
            );
         }),
      Promise.resolve()
   );

   return cyclePools().then(
      () => new NextResponse("OK"),
      err => {
         console.error(err);
         return new NextResponse("Error", { status: 500 });
      }
   );
}
