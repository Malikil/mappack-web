"use server";

import db from "@/app/api/db/connection";
import { createMappool, cyclePools } from "@/helpers/addPool";
import { getCurrentPack } from "@/helpers/currentPack";
import { convertPP } from "@/helpers/rating-range";
import { delay } from "@/time";
import { PolynomialRegressor } from "@rainij/polynomial-regression-js";
import { Client, LegacyClient } from "osu-web.js";

async function getPreviousMapScalings(mode) {
   console.log("Get previous map scalings");
   const mapsDb = db.collection("maps");
   const maplist = mapsDb.find({ mode });
   const datasets = { x: [], y: [] };
   for await (const pool of maplist) {
      pool.maps.forEach(map => {
         const { nm, hd, hr, dt } = map.ratings;
         datasets.x.push([map.stars, map.length, map.bpm, map.ar, map.cs]);
         datasets.y.push([nm.rating, hd.rating, hr.rating, dt.rating]);
         //console.log([map.stars, nm.rating, hd.rating, hr.rating, dt.rating].join(", "));
      });
   }
   const polyReg = new PolynomialRegressor(2);
   polyReg.fit(datasets.x, datasets.y);
   // const results = {
   //    nm: new MLR(datasets.nm.x, datasets.nm.y),
   //    hd: new MLR(datasets.hd.x, datasets.hd.y),
   //    hr: new MLR(datasets.hr.x, datasets.hr.y),
   //    dt: new MLR(datasets.dt.x, datasets.dt.y)
   // };
   return {
      poly: polyReg
   };
}

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

export async function debug() {
   const maps = await getCurrentPack("fruits");
   maps.forEach(map =>
      console.log(
         map.stars,
         ", ",
         Object.keys(map.ratings)
            .map(k => map.ratings[k].rating)
            .join(", ")
      )
   );
   // ========== TEMPORARY MANUAL FETCH NEW CTB POOL ==========
   // Get recent beatmap packs
   // const accessToken = await getOsuToken();
   // const client = new Client(accessToken);
   // /** @type {import("@/types/undocumented.beatmappacks").UndocumentedBeatmappackResponse} */
   // const packs = await client.getUndocumented("beatmaps/packs");
   // console.log(packs.beatmap_packs.slice(0, 5), `+ ${packs.beatmap_packs.length - 5} more`);
   // console.log(packs.beatmap_packs.filter(p => p.ruleset_id === 1));
   // const mappackMeta = packs.beatmap_packs.find(p => !p.ruleset_id); // === 2 ctb
   // console.log(`Found mappack ${mappackMeta.tag}`);
   // /** @type {import("@/types/undocumented.beatmappacks").UndocumentedBeatmappack} */
   // const mappack = await client.getUndocumented(`beatmaps/packs/${mappackMeta.tag}`);
   // console.log(`Add mappack ${mappack.tag}`);
   // await createMappool(
   //    accessToken,
   //    mappack.name,
   //    mappack.url,
   //    mappack.beatmapsets.map(bms => bms.id),
   //    "osu"
   // );
}

export async function updateV1Meta() {
   const maps = await getCurrentPack();
   const updates = await maps.reduce(async (wait, map) => {
      const arr = await wait.then(arr => delay(1000).then(() => arr));
      console.log(`Get top score for ${map.artist} - ${map.title} [${map.version}]`);
      /** @type {import("osu-web.js").LegacyBeatmapScore[]} */
      const [topScore] = await fetch(
         `https://osu.ppy.sh/api/get_scores?k=${process.env.OSU_LEGACY_KEY}&b=${map.id}&limit=1&mods=0`
      ).then(data => data.json());
      console.log(topScore.score);
      arr.push({
         updateOne: {
            filter: { _id: map.id },
            update: {
               $set: { score: parseInt(topScore.score) }
            },
            upsert: true
         }
      });
      return arr;
   }, Promise.resolve([]));
   console.log(
      await db.collection("v1meta").bulkWrite([
         {
            deleteMany: {
               filter: {
                  _id: { $nin: maps.map(m => m.id) }
               }
            }
         },
         ...updates
      ])
   );
}
