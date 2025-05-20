import db from "@/app/api/db/connection";
import { Client, GameMode } from "osu-web.js";
import { PolynomialRegressor } from "@rainij/polynomial-regression-js";
import { DbBeatmap, DbMappack } from "@/types/database.beatmap";
import { DbHistory } from "@/types/database.history";
import { UndocumentedBeatmapsetResponse } from "@/types/undocumented.beatmapset";
import { ModRatings } from "@/types/rating";

const INIT_MAP_RD = 100;

async function getPreviousMapScalings(mode: GameMode) {
   console.log("Get previous map scalings");
   const mapsDb = db.collection<DbMappack>("maps");
   const maplist = mapsDb.find({ mode });
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

export async function createMappool(
   accessToken: string,
   packName: string,
   download: string,
   mapsets: number[],
   gamemode: GameMode = "osu",
   alsoFruits: boolean = false
) {
   console.log(`Create pool ${packName}`);
   // Make sure this pack hasn't been used yet
   const historyDb = db.collection<DbHistory>("history");
   if (await historyDb.findOne({ mode: gamemode, packs: packName })) throw new Error("409");

   const osuClient = new Client(accessToken);
   const predictor = await getPreviousMapScalings(gamemode);
   // Rather than fetch the latest std pack all over again when prepping ctb pools, just calc both
   // ratings duing the std fetch
   const ctbPredictor =
      gamemode === "osu" && alsoFruits && (await getPreviousMapScalings("fruits"));

   const maplist: (DbBeatmap & { mode: GameMode; })[] = await mapsets
      .reduce(
         (prom, setId) =>
            prom.then(async arr => {
               console.log(`Fetch mapset ${setId}`);
               const mapset = await osuClient.getUndocumented<UndocumentedBeatmapsetResponse>(`beatmapsets/${setId}`);
               console.log(mapset.title);
               return arr.concat(
                  (
                     await Promise.all(
                        mapset.beatmaps.map(async (bm): Promise<(DbBeatmap & { mode: GameMode })[]> => {
                           // Ignore maps from other modes
                           // For taiko/mania, always reject other modes
                           if (gamemode === "mania" || gamemode === "taiko") {
                              if (bm.mode !== gamemode) return null;
                           }
                           // For ctb/std only reject taiko/mania maps
                           else if (bm.mode === "mania" || bm.mode === "taiko") return null;

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
                              stars: bm.difficulty_rating,
                              mode: bm.mode,
                              ratings: null
                           };
                           console.log(bm.id, mapData);

                           // Get the ctb difficulty if it's a converted map
                           const altData: DbBeatmap & { mode: GameMode; } = bm.mode === "osu" &&
                              (alsoFruits || gamemode === "fruits") && {
                                 ...mapData,
                                 stars:
                                    // The old star rating is acceptable if there's a network error here (for now)
                                    (
                                       await osuClient.beatmaps
                                          .getBeatmapAttributes(bm.id, "fruits")
                                          .catch(err => { console.error(bm.id, err); return null; })
                                    )?.star_rating ||
                                    mapData.stars,
                                 mode: "fruits"
                              };
                           console.log(bm.id, "altData", altData);

                           // Reduce initial rd for maps, the initial rating is already based on their
                           // stars and past experience
                           const ratings = predictor.predict([
                                 [
                                    mapData.stars,
                                    mapData.length,
                                    mapData.bpm,
                                    mapData.ar,
                                    mapData.cs
                                 ]
                              ])[0],
                              vol = 0.06;
                           mapData.ratings = {
                              nm: { rating: ratings[0], rd: INIT_MAP_RD, vol },
                              hd: { rating: ratings[1], rd: INIT_MAP_RD, vol },
                              hr: { rating: ratings[2], rd: INIT_MAP_RD, vol },
                              dt: { rating: ratings[3], rd: INIT_MAP_RD, vol }
                           };

                           if (altData) {
                              // If this is a converted map in a ctb pack, the original predictor needs
                              // to be used instead
                              const altRatings = (ctbPredictor || predictor).predict([
                                    [
                                       altData.stars,
                                       altData.length,
                                       altData.bpm,
                                       altData.ar,
                                       altData.cs
                                    ]
                                 ])[0],
                                 vol = 0.06;
                              altData.ratings = {
                                 nm: { rating: altRatings[0], rd: INIT_MAP_RD, vol },
                                 hd: { rating: altRatings[1], rd: INIT_MAP_RD, vol },
                                 hr: { rating: altRatings[2], rd: INIT_MAP_RD, vol },
                                 dt: { rating: altRatings[3], rd: INIT_MAP_RD, vol }
                              };
                           }
                           console.log(bm.id, mapData.ratings, altData?.ratings);
                           return [mapData, altData];
                        })
                     )
                  )
                     .flat()
                     .filter(m => m)
               );
            }),
         Promise.resolve<(DbBeatmap & { mode: GameMode; })[]>([])
      )
      .catch(err => {
         console.error(err);
         throw new Error();
      });

   // Prepare the insert object
   const insert = [
      {
         name: packName,
         download,
         maps: maplist
            .filter(m => m.mode === gamemode)
            .map(m => {
               const res = { ...m };
               delete res.mode;
               return res;
            }),
         active: "pending",
         mode: gamemode
      }
   ];
   const history = [
      {
         updateOne: {
            filter: { mode: gamemode },
            update: {
               $push: {
                  packs: {
                     $each: [packName],
                     $position: 0,
                     $slice: 50
                  }
               }
            },
            upsert: true
         }
      }
   ];
   // If this is a std pack, also insert it for ctb
   if (gamemode === "osu" && alsoFruits) {
      insert.push({
         name: packName,
         download,
         maps: maplist
            .filter(m => m.mode === "fruits")
            .map(m => {
               const res = { ...m };
               delete res.mode;
               return res;
            }),
         active: "pending",
         mode: "fruits"
      });
      history.push({
         updateOne: {
            filter: { mode: "fruits" },
            update: {
               $push: {
                  packs: {
                     $each: [packName],
                     $position: 0,
                     $slice: 50
                  }
               }
            },
            upsert: true
         }
      });
   }

   // Add to database
   const collection = db.collection("maps");
   const result = await collection.insertMany(insert);
   const histResult = await historyDb.bulkWrite(history);
   console.log(result, histResult);
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
