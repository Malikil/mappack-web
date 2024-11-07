"use server";

import { Client } from "osu-web.js";
import { verify } from "../../functions";
import db from "@/app/api/db/connection";

export async function addMappool(formData) {
   const session = await verify();

   const packName = formData.get("packName");
   const download = formData.get("download");
   /** @type {number[]} */
   const mapsets = formData
      .get("maps")
      .split("\n")
      .map(v => parseInt(v))
      .filter(v => v);

   const osuClient = new Client(session.accessToken);

   /** @type {import("@/types/database.beatmap").DbBeatmap[]} */
   const maplist = await mapsets.reduce(
      (prom, setId) =>
         prom.then(async arr => {
            /** @type {import("@/types/undocumented.beatmapset").UndocumentedBeatmapsetResponse} */
            const mapset = await osuClient.getUndocumented(`beatmapsets/${setId}`);
            console.log(mapset.title);
            return arr.concat(
               mapset.beatmaps
                  .map(bm => {
                     // Ignore maps from other modes
                     if (bm.mode !== "osu") return null;

                     const mapData = {
                        id: bm.id,
                        setid: mapset.id,
                        artist: mapset.artist_unicode,
                        title: mapset.title_unicode,
                        version: bm.version,
                        length: bm.total_length,
                        bpm: bm.bpm,
                        cs: bm.cs,
                        ar: bm.ar,
                        stars: bm.difficulty_rating
                     };
                     // Scale linearly 0* => 0 rating
                     //                5* => 1500 rating
                     const rating = mapData.stars * 300;
                     // Estimate HD with 1.02 ^ (10 - AR). Subject to change
                     const hdRating = Math.pow(1.01, 10 - bm.ar) * rating;
                     // Estimate HR/DT with 1.1x and 1.5x. Subject to change
                     const rd = 350,
                        vol = 0.06;
                     mapData.ratings = {
                        nm: { rating, rd, vol },
                        hd: {
                           rating: hdRating,
                           rd,
                           vol
                        },
                        hr: {
                           rating: rating * 1.1,
                           rd,
                           vol
                        },
                        dt: {
                           rating: rating * 1.5,
                           rd,
                           vol
                        }
                     };
                     return mapData;
                  })
                  .filter(m => m)
            );
         }),
      Promise.resolve([])
   );

   // Add to database
   const collection = db.collection("maps");
   const result = await collection.insertOne({
      name: packName,
      download,
      maps: maplist,
      active: "pending"
   });
   console.log(result);
}
