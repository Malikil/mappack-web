"use server";

import db from "@/app/api/db/connection";
import { getCurrentPack } from "@/helpers/currentPack";
import { delay } from "@/time";
import { PolynomialRegressor } from "@rainij/polynomial-regression-js";

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

export async function debug() {
   //const predictor = await getPreviousMapScalings("osu");
   const players = db.collection("players").find();
   for await (const player of players) {
      console.log(player.pvp.vol);
      console.log(player.pve.vol);
   }
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
