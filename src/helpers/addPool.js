import db from "@/app/api/db/connection";
import { Client } from "osu-web.js";
import regression from "regression";

async function getPreviousMapScalings(mode) {
   console.log("Get previous map scalings");
   const mapsDb = db.collection("maps");
   const maplist = mapsDb.find({ mode });
   const datasets = { nm: [], hd: [], hr: [], dt: [] };
   for await (const pool of maplist) {
      pool.maps.forEach(map => {
         const { nm, hd, hr, dt } = map.ratings;
         datasets.nm.push([map.stars, nm.rating]);
         datasets.hd.push([map.stars, hd.rating]);
         datasets.hr.push([map.stars, hr.rating]);
         datasets.dt.push([map.stars, dt.rating]);
      });
   }
   const results = {
      nm: regression.linear(datasets.nm),
      hd: regression.linear(datasets.hd),
      hr: regression.linear(datasets.hr),
      dt: regression.linear(datasets.dt)
   };
   return results;
}

export async function createMappool(accessToken, packName, download, mapsets) {
   console.log(`Create pool ${packName}`);
   // Make sure this pack hasn't been used yet
   const historyDb = db.collection("history");
   if (await historyDb.findOne({ mode: "osu", packs: packName }))
      return {
         http: {
            status: 409,
            message: "Pack has already been used"
         }
      };

   const osuClient = new Client(accessToken);
   const oldRatings = await getPreviousMapScalings("osu");

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
                           artist: mapset.artist,
                           title: mapset.title,
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
      active: "pending",
      mode: "osu"
   });
   historyDb.updateOne({ mode: "osu" }, { $push: { packs: packName } }, { upsert: true });
   console.log(result);
}
