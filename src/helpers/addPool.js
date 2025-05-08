import db from "@/app/api/db/connection";
import { Client } from "osu-web.js";
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
      });
   }
   const polyReg = new PolynomialRegressor(2);
   polyReg.fit(datasets.x, datasets.y);
   return polyReg;
}

/**
 * @param {string} accessToken 
 * @param {string} packName 
 * @param {string} download 
 * @param {number[]} mapsets 
 * @param {import("osu-web.js").GameMode} gamemode 
 */
export async function createMappool(accessToken, packName, download, mapsets, gamemode = 'osu') {
   console.log(`Create pool ${packName}`);
   // Make sure this pack hasn't been used yet
   const historyDb = db.collection("history");
   if (await historyDb.findOne({ mode: gamemode, packs: packName })) throw new Error("409");

   const osuClient = new Client(accessToken);
   const predictor = await getPreviousMapScalings(gamemode);

   /** @type {import("@/types/database.beatmap").DbBeatmap[]} */
   const maplist = await mapsets
      .reduce(
         (prom, setId) =>
            prom.then(async arr => {
               /** @type {import("@/types/undocumented.beatmapset").UndocumentedBeatmapsetResponse} */
               const mapset = await osuClient.getUndocumented(`beatmapsets/${setId}`);
               console.log(mapset.title);
               return arr.concat(
                  (
                     await Promise.all(
                        mapset.beatmaps.map(async bm => {
                           // Ignore maps from other modes
                           // Special case: Accept std maps for ctb
                           if (bm.mode !== gamemode && gamemode !== "fruits" && bm.mode !== "osu")
                              return null;

                           const mapData = {
                              id: bm.id,
                              setid: mapset.id,
                              artist: mapset.artist,
                              title: mapset.title,
                              version: bm.version,
                              mapper: mapset.creator,
                              length: bm.total_length,
                              bpm: bm.bpm,
                              cs: bm.cs,
                              ar: bm.ar,
                              stars: bm.difficulty_rating
                           };
                           // Get the ctb difficulty if it's a converted map
                           if (gamemode === "fruits" && bm.mode === "osu") {
                              /** @type {import("osu-web.js").FruitsBeatmapDifficultyAttributes} */
                              const mapInfo = await osuClient.beatmaps.getBeatmapAttributes(
                                 bm.id,
                                 gamemode
                              );
                              mapData.stars = mapInfo.star_rating;
                           }
                           // Reduce initial rd for maps, the initial rating is already based on their stars and past experience
                           const ratings = predictor.predict([
                                 [
                                    mapData.stars,
                                    mapData.length,
                                    mapData.bpm,
                                    mapData.ar,
                                    mapData.cs
                                 ]
                              ])[0],
                              rd = 175,
                              vol = 0.06;
                           mapData.ratings = {
                              nm: { rating: ratings[0], rd, vol },
                              hd: { rating: ratings[1], rd, vol },
                              hr: { rating: ratings[2], rd, vol },
                              dt: { rating: ratings[3], rd, vol }
                           };
                           return mapData;
                        })
                     )
                  ).filter(m => m)
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
      mode: gamemode
   });
   historyDb.updateOne({ mode: gamemode }, { $push: { packs: packName } }, { upsert: true });
   console.log(result);
}

export async function cyclePools() {
   const collection = db.collection("maps");
   if (!(await collection.findOne({ active: "pending" })))
      return {
         http: {
            status: 400,
            message: "No pending pool available"
         }
      };

   const result = await collection.bulkWrite([
      {
         deleteMany: {
            filter: { active: "completed" }
         }
      },
      {
         updateMany: {
            filter: { active: "stale" },
            update: { $set: { active: "completed" } }
         }
      },
      {
         updateMany: {
            filter: { active: "fresh" },
            update: { $set: { active: "stale" } }
         }
      },
      {
         updateMany: {
            filter: { active: "pending" },
            update: { $set: { active: "fresh" } }
         }
      }
   ]);
   console.log(result);
}
