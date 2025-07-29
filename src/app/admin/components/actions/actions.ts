"use server";

import { mappacksDb, mapsDb } from "@/app/api/db/connection";
import { addMatchData } from "@/app/api/db/pvp/functions";
import { addMapsToDatabase, createMappool, cyclePools } from "@/helpers/addPool";
import { getCurrentPack } from "@/helpers/currentPack";
import { getOsuToken } from "@/helpers/osuToken";
import { convertPP } from "@/helpers/rankPredictor";
import { delay } from "@/time";
import { DbBeatmap } from "@/types/database.beatmap";
import { DbMappack, MappackActiveState } from "@/types/database.mappack";
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
   const ctbReference = [
      2588870, 2887892, 4258650, 4258652, 4045932, 4258651, 4041553, 4619760, 4528202, 4528206, 4528204,
      4528205, 4528203, 4359942, 4482567, 4860140, 4598998, 4537972, 4533556, 4653094, 4787935, 4756503,
      4760982, 4756502, 4787755, 5006431, 4755696, 4808969, 4865954, 4873192, 4908620, 4938348, 4938346,
      4938352, 5055491, 4938354, 4941459, 4938787, 4947054, 4938788, 4938351, 4938350, 4934824, 4944781,
      5004764, 5073559, 4987416, 4959291, 5073562, 4973153, 4954143, 4953095, 5073560, 5073561, 4962030,
      4955439, 4980813, 4972785, 4955429, 4977207, 4955428, 4955427, 4961223, 4985230, 4985349, 4986710,
      4987911, 4987910, 4982237, 5041696, 5069998
   ];
   // const banchoClient = new Client(
   //    ""
   // );
   // const banchoMaps = await banchoClient.beatmaps.getBeatmaps({
   //    query: { ids: ctbReference.map(m => m[0]) }
   // });
   const result = await mapsDb.bulkWrite(
      ctbReference.map(id => {
         return {
            updateOne: {
               filter: { id, mode: "fruits" },
               update: [
                  {
                     $set: {
                        "ratings.hd.rating": { $multiply: ["$ratings.nm.rating", 1.02] },
                        "ratings.hd.rd": { $multiply: ["$ratings.nm.rd", 1.02] },
                        "ratings.hr.rating": { $multiply: ["$ratings.nm.rating", 1.03] },
                        "ratings.hr.rd": { $multiply: ["$ratings.nm.rd", 1.03] },
                        "ratings.dt.rating": { $multiply: ["$ratings.nm.rating", 1.04] },
                        "ratings.dt.rd": { $multiply: ["$ratings.nm.rd", 1.04] }
                     }
                  }
               ]
            }
         };
      })
   );
   console.log(result);
}
