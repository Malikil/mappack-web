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
//const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, max));

async function getPreviousMapScalings(mode: GameMode) {
   console.log("Get previous map scalings");
   const maplist = mapsDb.aggregate<DbBeatmap & { rdSum: number }>([
      { $match: { mode } },
      {
         $addFields: {
            rdSum: { $add: ["$ratings.nm.rd", "$ratings.hd.rd", "$ratings.hr.rd", "$ratings.dt.rd"] }
         }
      },
      { $match: { rdSum: { $lt: 400 } } },
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
      datasets.x.push([
         map.stars,
         map.length,
         map.bpm,
         map.ar,
         map.cs,
         map.noteCount.circles,
         map.noteCount.sliders,
         map.maxCombo
      ]);
      datasets.y.push([nm.rating, hd.rating, hr.rating, dt.rating]);
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
   const [[nm, hd, hr, dt]] = predictor.predict([
      [
         osuBeatmap.difficulty_rating,
         osuBeatmap.total_length,
         osuBeatmap.bpm,
         osuBeatmap.ar,
         osuBeatmap.cs,
         osuBeatmap.count_circles,
         osuBeatmap.count_sliders,
         osuBeatmap.max_combo
      ]
   ]);
   const ratingObj = (rating: number) => {
      if (rating > max)
         return { rating: max, rd: rating - max + INIT_MAP_RD, vol: INIT_MAP_VOL };
      else if (rating < RATING_MIN)
         return { rating: RATING_MIN, rd: RATING_MIN - rating + INIT_MAP_RD, vol: INIT_MAP_VOL };
      else return { rating, rd: INIT_MAP_RD, vol: INIT_MAP_VOL };
   }
   const mapData: DbBeatmap = {
      id: osuBeatmap.id,
      setid: osuBeatmap.beatmapset_id,
      artist: osuBeatmap.beatmapset.artist,
      title: osuBeatmap.beatmapset.title,
      version: osuBeatmap.version,
      mapper: osuBeatmap.beatmapset.creator,
      mode: osuBeatmap.mode,
      stars: osuBeatmap.difficulty_rating,
      length: osuBeatmap.total_length,
      bpm: osuBeatmap.bpm,
      ar: osuBeatmap.ar,
      cs: osuBeatmap.cs,
      od: osuBeatmap.accuracy,
      maxCombo: osuBeatmap.max_combo,
      noteCount: {
         circles: osuBeatmap.count_circles,
         sliders: osuBeatmap.count_sliders
      },
      ratings: {
         nm: ratingObj(nm),
         hd: ratingObj(hd),
         hr: ratingObj(hr),
         dt: ratingObj(dt)
      }
   };
   // If the map is unranked, include dates to re-query later
   if (osuBeatmap.ranked < 1) {
      mapData.lastQuery = new Date();
      mapData.lastUpdate = new Date(osuBeatmap.last_updated);
   }
   return mapData;
}

export async function addMapsToDatabase(
   accessToken: string,
   maps: {
      id: number;
      mode: GameMode;
   }[]
): Promise<DbBeatmap[]> {
   // Convert maps list to object with id key and modes array
   const modes = maps.reduce((obj, map) => {
      if (!(map.id in obj)) obj[map.id] = new Set();
      obj[map.id].add(map.mode);
      return obj;
   }, {} as { [mapid: number]: Set<GameMode> });
   const maplist = Object.keys(modes).map(id => parseInt(id));
   console.log("Fetch data for beatmaps list", modes);
   // Get the map info from osu
   const client = new Client(accessToken);
   const predictors = {
      cache: {} as Partial<Record<GameMode, PolynomialRegressor>>,
      async get(mode: GameMode): Promise<PolynomialRegressor> {
         if (!this.cache[mode]) this.cache[mode] = await getPreviousMapScalings(mode);
         return this.cache[mode];
      }
   };
   const resultList: DbBeatmap[] = [];
   for (const sublist of batchArray(maplist)) {
      const osuBeatmaps = await client.beatmaps.getBeatmaps({ query: { ids: sublist } });
      for (const osuBeatmap of osuBeatmaps) {
         // Ignore maps without leaderboards
         //if (osuBeatmap.ranked < 1) continue;
         console.log(osuBeatmap.id, modes[osuBeatmap.id]);
         // Cycle through the modes we want to fetch.
         // If the mode is different we need to get additional attributes
         // Initial case for the default mode, so we don't have to hit the API twice
         if (modes[osuBeatmap.id].delete(osuBeatmap.mode)) {
            const predictor = await predictors.get(osuBeatmap.mode);
            const dbbm = prepBeatmapData(osuBeatmap, predictor);
            resultList.push(dbbm);
         }
         // Handle any remaining modes
         for (const mode of modes[osuBeatmap.id]) {
            if (mode !== osuBeatmap.mode) {
               const attributes = await client.beatmaps.getBeatmapAttributes(osuBeatmap.id, mode);
               osuBeatmap.difficulty_rating = attributes.star_rating;
               osuBeatmap.mode = mode;
               const predictor = await predictors.get(mode);
               resultList.push(prepBeatmapData(osuBeatmap, predictor));
            }
         }
      }
   }
   // Add the maplist to database. Ignore duplicates
   const dbWriteResult = await mapsDb
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
      maps: maplist.filter(m => m.mode === gamemode).map(m => m.id),
      active: "pending",
      mode: gamemode
   };

   // Add to database
   const mapsResult = await mapsDb.insertMany(maplist, { ordered: false }).catch(err => {
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
