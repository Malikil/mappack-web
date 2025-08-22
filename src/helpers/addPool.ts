import { historyDb, mappacksDb, mapsDb } from "@/app/api/db/connection";
import { Beatmap, Beatmapset, Client, FruitsBeatmapDifficultyAttributes, GameMode } from "osu-web.js";
import { PolynomialRegressor } from "@rainij/polynomial-regression-js";
import { DbBeatmap } from "@/types/database.beatmap";
import { UndocumentedBeatmapsetResponse } from "@/types/undocumented.beatmapset";
import { DbMappack } from "@/types/database.mappack";
import { batchArray } from "./list-splitter";
import { Rating } from "@/types/rating";

const INIT_MAP_RD = 150;
const INIT_MAP_VOL = 0.06;
const RATING_MIN = 500;

async function getPreviousMapScalings(mode: GameMode) {
   console.log("Get previous map scalings");
   const adding = ["$ratings.nm.rd", "$ratings.dt.rd"];
   if (mode !== "mania") adding.push("$ratings.hd.rd", "$ratings.hr.rd");
   const maplist = mapsDb[mode].aggregate<DbBeatmap & { rdSum: number }>([
      {
         $addFields: {
            rdSum: { $add: adding }
         }
      },
      { $match: { rdSum: { $lt: mode === "mania" ? 280 : 400 } } },
      { $sort: { rdSum: 1 } },
      { $limit: 1000 }
   ]);
   const datasets = { x: [] as number[][], y: [] as number[][] };
   const meta = { max: 1500 };
   for await (const map of maplist) {
      const { nm, hd, hr, dt } = map.ratings;
      // Update the max and min
      for (const rating of Object.values<Rating>(map.ratings)) {
         meta.max = Math.max(meta.max, rating.rating + rating.rd * 2);
      }
      const xData = [
         map.stars,
         map.length,
         map.bpm,
         map.noteCount.circles,
         map.noteCount.sliders,
         map.maxCombo
      ];
      if (mode !== "fruits") xData.push(map.od);
      if (mode !== "taiko") xData.push(map.cs);
      if (mode === "osu") xData.push(map.ar);
      else if (mode === "fruits") {
         xData.push(map.ar);
         xData.push(+map.convert);
      }
      datasets.x.push(xData);
      datasets.y.push([nm.rating, hd?.rating || 0, hr?.rating || 0, dt.rating]);
   }
   const polyReg: PolynomialRegressor & { meta?: { max: number } } = new PolynomialRegressor(1);
   polyReg.fit(datasets.x, datasets.y);
   polyReg.meta = meta;
   return polyReg;
}

function prepBeatmapData(
   osuBeatmap: Beatmap & {
      max_combo: number;
      beatmapset: Beatmapset;
   },
   predictor: PolynomialRegressor & { meta?: { max: number } }
): DbBeatmap {
   const { max } = predictor.meta;
   const predictData = [
      osuBeatmap.difficulty_rating,
      osuBeatmap.total_length,
      osuBeatmap.bpm,
      osuBeatmap.count_circles,
      osuBeatmap.count_sliders,
      osuBeatmap.max_combo
   ];
   if (osuBeatmap.mode !== "fruits") predictData.push(osuBeatmap.accuracy);
   if (osuBeatmap.mode !== "taiko") predictData.push(osuBeatmap.cs);
   if (osuBeatmap.mode === "osu") predictData.push(osuBeatmap.ar);
   else if (osuBeatmap.mode === "fruits") {
      predictData.push(osuBeatmap.ar);
      predictData.push(+osuBeatmap.convert);
   }
   const [[nm, hd, hr, dt]] = predictor.predict([predictData]);
   const ratingObj = (rating: number) => {
      if (rating > max) return { rating: max, rd: rating - max + INIT_MAP_RD, vol: INIT_MAP_VOL };
      else if (rating < RATING_MIN)
         return { rating: RATING_MIN, rd: RATING_MIN - rating + INIT_MAP_RD, vol: INIT_MAP_VOL };
      else return { rating, rd: INIT_MAP_RD, vol: INIT_MAP_VOL };
   };
   const mapData: DbBeatmap = {
      _id: osuBeatmap.id,
      setid: osuBeatmap.beatmapset_id,
      artist: osuBeatmap.beatmapset.artist,
      title: osuBeatmap.beatmapset.title,
      version: osuBeatmap.version,
      mapper: osuBeatmap.beatmapset.creator,
      stars: osuBeatmap.difficulty_rating,
      length: osuBeatmap.total_length,
      bpm: osuBeatmap.bpm,
      maxCombo: osuBeatmap.max_combo,
      noteCount: {
         circles: osuBeatmap.count_circles,
         sliders: osuBeatmap.count_sliders
      },
      ratings: {
         nm: ratingObj(nm),
         dt: ratingObj(dt)
      }
   };
   // If the map is unranked, include dates to re-query later
   if (osuBeatmap.ranked < 1) {
      mapData.lastQuery = new Date();
      mapData.lastUpdate = new Date(osuBeatmap.last_updated);
   }
   if (osuBeatmap.mode !== "fruits") mapData.od = osuBeatmap.accuracy;
   if (osuBeatmap.mode !== "taiko") mapData.cs = osuBeatmap.cs;
   if (osuBeatmap.mode !== "mania") {
      mapData.ratings.hd = ratingObj(hd);
      mapData.ratings.hr = ratingObj(hr);
   }
   if (osuBeatmap.mode === "osu") mapData.ar = osuBeatmap.ar;
   else if (osuBeatmap.mode === "fruits") {
      mapData.ar = osuBeatmap.ar;
      mapData.convert = osuBeatmap.convert;
   }

   return mapData;
}

export async function addMapsToDatabase(
   accessToken: string,
   mode: GameMode,
   maps: number[]
): Promise<DbBeatmap[]> {
   console.log("Fetch data for beatmaps list");
   // Get the map info from osu
   const client = new Client(accessToken);
   const predictor = await getPreviousMapScalings(mode);
   const resultList: DbBeatmap[] = [];
   for (const sublist of batchArray(maps)) {
      const osuBeatmaps = await client.beatmaps.getBeatmaps({ query: { ids: sublist } });
      for (const osuBeatmap of osuBeatmaps) {
         console.log(osuBeatmap.id, osuBeatmap.beatmapset.title);
         // If the mode is different we need to get additional attributes
         if (mode !== osuBeatmap.mode) {
            // Don't add converts for modes other than ctb
            if (mode !== "fruits") continue;
            const attributes = await client.beatmaps.getBeatmapAttributes(osuBeatmap.id, mode);
            osuBeatmap.difficulty_rating = attributes.star_rating;
            osuBeatmap.mode = mode;
            osuBeatmap.convert = true;
         }
         const dbmap = prepBeatmapData(osuBeatmap, predictor);
         resultList.push(dbmap);
      }
   }
   // Add the maplist to database. Ignore duplicates
   const dbWriteResult = await mapsDb[mode]
      .insertMany(resultList, { ordered: false })
      .catch(err => console.warn(err));
   console.log(dbWriteResult);
   return resultList;
}

export async function createMappool(
   accessToken: string,
   packName: string,
   download: string,
   mapsets: number[],
   gamemode: GameMode = "osu"
) {
   console.log(`Create pool ${packName}`);
   // Make sure this pack hasn't been used yet
   if (await historyDb.findOne({ _id: `${gamemode}Packs`, items: packName })) throw new Error("409");

   const osuClient = new Client(accessToken);
   const predictor = await getPreviousMapScalings(gamemode);

   const maplist: DbBeatmap[] = await mapsets
      .reduce(
         (prom, setId) =>
            prom.then(async arr => {
               console.log(`Fetch mapset ${setId}`);
               const mapset = await osuClient.getUndocumented<UndocumentedBeatmapsetResponse>(
                  `beatmapsets/${setId}`
               );
               console.log(mapset.title);
               return arr.concat(
                  (
                     await Promise.all(
                        mapset.beatmaps.map(async (bm): Promise<DbBeatmap> => {
                           // Ignore maps from other modes
                           // For ctb, only skip mania or taiko
                           if (gamemode === "fruits") {
                              if (bm.mode === "mania" || bm.mode === "taiko") return null;
                           }
                           // Otherwise reject if the map's mode doesn't match
                           else if (bm.mode !== gamemode) return null;

                           // If this is a converted map, get the ctb stats
                           if (gamemode === "fruits" && bm.mode === "osu") {
                              const ctbData = await osuClient.beatmaps
                                 .getBeatmapAttributes(bm.id, "fruits")
                                 .catch(err => {
                                    console.error(bm.id, err);
                                    return null as FruitsBeatmapDifficultyAttributes;
                                 });
                              bm.difficulty_rating = ctbData?.star_rating || bm.difficulty_rating;
                              bm.mode = "fruits";
                              bm.convert = true;
                           }

                           const mapData: DbBeatmap = prepBeatmapData(
                              { ...bm, beatmapset: { ...mapset, user_id: mapset.user_id.toString() } },
                              predictor
                           );
                           console.log(bm.id, mapData);
                           return mapData;
                        })
                     )
                  ).filter(m => m)
               );
            }),
         Promise.resolve<DbBeatmap[]>([])
      )
      .catch(err => {
         console.error(err);
         throw new Error();
      });

   // Prepare the insert object
   const insertPack: DbMappack = {
      name: packName,
      download,
      maps: maplist.map(m => m._id),
      active: "pending",
      mode: gamemode
   };

   // Add to database
   const mapsResult = await mapsDb[gamemode].insertMany(maplist as any, { ordered: false }).catch(err => {
      console.warn("Insert maps write error");
      return { ...(err.result || {}), errs: err.writeErrors?.length };
   });
   console.log(mapsResult);
   const result = await mappacksDb.insertOne(insertPack);
   const histResult = await historyDb.updateOne(
      { _id: `${gamemode}Packs` },
      {
         $push: {
            items: {
               $each: [packName],
               $position: 0,
               $slice: 50
            }
         }
      }
   );
   console.log(result, histResult);
}

export async function cyclePools() {
   if (!(await mappacksDb.findOne({ active: "pending" })))
      return {
         http: {
            status: 400,
            message: "No pending pool available"
         }
      };

   const result = await mappacksDb.bulkWrite([
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
