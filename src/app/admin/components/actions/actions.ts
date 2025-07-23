"use server";

import { mappacksDb, mapsDb } from "@/app/api/db/connection";
import { addMapsToDatabase, createMappool, cyclePools } from "@/helpers/addPool";
import { getCurrentPack } from "@/helpers/currentPack";
import { getOsuToken } from "@/helpers/osuToken";
import { convertPP } from "@/helpers/rankPredictor";
import { delay } from "@/time";
import { DbBeatmap } from "@/types/database.beatmap";
import { DbMappack } from "@/types/database.mappack";
import { PolynomialRegressor } from "@rainij/polynomial-regression-js";
import { Client, GameMode, LegacyClient } from "osu-web.js";

async function getPreviousMapScalings(mode: GameMode) {
   console.log("Get previous map scalings");
   const maplist = mappacksDb.aggregate<Omit<DbMappack, "maps"> & { maps: DbBeatmap[] }>([
      { $match: { mode } },
      {
         $lookup: {
            from: "maps",
            localField: "maps",
            foreignField: "id",
            pipeline: [{ $match: { mode } }],
            as: "maps"
         }
      }
   ]);
   const datasets = { x: [] as number[][], y: [] as number[][] };
   for await (const pool of maplist) {
      pool.maps.forEach(map => {
         const { nm, hd, hr, dt } = map.ratings;
         datasets.x.push([map.stars, map.length, map.bpm, map.ar, map.cs]);
         datasets.y.push([nm.rating, hd.rating, hr.rating, dt.rating]);
      });
   }
   const polyReg = new PolynomialRegressor(2);
   polyReg.fit(datasets.x, datasets.y);
   return polyReg;
}

export async function debug() {
   const result = await addMapsToDatabase(await getOsuToken(), [
      { id: 4815740, mode: "fruits" },
      { id: 5183851, mode: "osu" },
      { id: 5026766, mode: "osu" },
      { id: 5026766, mode: "fruits" },
      { id: 5204711, mode: "fruits" }
   ]);
   console.log(result);
}

// export async function updateV1Meta() {
//    const maps = await getCurrentPack();
//    const updates = await maps.reduce(async (wait, map) => {
//       const arr = await wait.then(arr => delay(1000).then(() => arr));
//       console.log(`Get top score for ${map.artist} - ${map.title} [${map.version}]`);
//       /** @type {import("osu-web.js").LegacyBeatmapScore[]} */
//       const [topScore] = await fetch(
//          `https://osu.ppy.sh/api/get_scores?k=${process.env.OSU_LEGACY_KEY}&b=${map.id}&limit=1&mods=0`
//       ).then(data => data.json());
//       console.log(topScore.score);
//       arr.push({
//          updateOne: {
//             filter: { _id: map.id },
//             update: {
//                $set: { score: parseInt(topScore.score) }
//             },
//             upsert: true
//          }
//       });
//       return arr;
//    }, Promise.resolve([]));
//    console.log(
//       await db.collection("v1meta").bulkWrite([
//          {
//             deleteMany: {
//                filter: {
//                   _id: { $nin: maps.map(m => m.id) }
//                }
//             }
//          },
//          ...updates
//       ])
//    );
// }
