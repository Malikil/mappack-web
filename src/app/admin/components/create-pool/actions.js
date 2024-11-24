"use server";

import { Client } from "osu-web.js";
import { verify } from "../../functions";
import db from "@/app/api/db/connection";
import { checkExpiry } from "@/auth";
import regression from "regression";

async function getPreviousMapScalings() {
   const mapsDb = db.collection("maps");
   const maplist = await mapsDb.findOne({ active: "current" });
   const datasets = maplist.maps.reduce(
      (agg, map) => {
         const { nm, hd, hr, dt } = map.ratings;
         agg.nm.push([map.stars, nm.rating]);
         agg.hd.push([map.stars, hd.rating]);
         agg.hr.push([map.stars, hr.rating]);
         agg.dt.push([map.stars, dt.rating]);
         return agg;
      },
      { nm: [], hd: [], hr: [], dt: [] }
   );
   const results = {
      nm: regression.linear(datasets.nm),
      hd: regression.linear(datasets.hd),
      hr: regression.linear(datasets.hr),
      dt: regression.linear(datasets.dt)
   };
   return results;
}

export async function addMappool(formData) {
   const { session } = await verify();
   if (!session)
      return {
         http: {
            status: 401,
            message: "Not admin"
         }
      };

   if (checkExpiry(session.accessToken))
      return {
         http: {
            status: 401,
            message: "Access token expired - please log in again"
         }
      };

   const packName = formData.get("packName");
   const download = formData.get("download");
   /** @type {number[]} */
   const mapsets = formData
      .get("maps")
      .split("\n")
      .map(v => parseInt(v))
      .filter(v => v);

   const osuClient = new Client(session.accessToken);
   const oldRatings = await getPreviousMapScalings();

   /** @type {import("@/types/database.beatmap").DbBeatmap[]} */
   const maplist = await mapsets
      .reduce(
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
                        // Reduce initial rd for maps, the initial rating is already based on their stars and past experience
                        const rd = 200,
                           vol = 0.06;
                        mapData.ratings = {
                           nm: { rating: oldRatings.nm.predict(mapData.stars)[1], rd, vol },
                           hd: { rating: oldRatings.hd.predict(mapData.stars)[1], rd, vol },
                           hr: { rating: oldRatings.hr.predict(mapData.stars)[1], rd, vol },
                           dt: { rating: oldRatings.dt.predict(mapData.stars)[1], rd, vol }
                        };
                        return mapData;
                     })
                     .filter(m => m)
               );
            }),
         Promise.resolve([])
      )
      .catch(err => {
         console.error(err);
         throw new Error();
      });

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
