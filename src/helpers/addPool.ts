import { historyDb, mappacksDb, mapsDb } from "@/app/api/db/connection";
import { Client, FruitsBeatmapDifficultyAttributes, GameMode } from "osu-web.js";
import { DbBeatmap } from "@/types/database.beatmap";
import { UndocumentedBeatmapsetResponse } from "@/types/undocumented.beatmapset";
import { DbMappack } from "@/types/database.mappack";
import { batchArray } from "./list-splitter";
import { getPreviousMapScalings, prepBeatmapData } from "./server/predictor";

/** @deprecated Use function from helpers/server/beatmaps */
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
      order: 0,
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
   const ACTIVE_MAPPACKS = parseInt(process.env.ACTIVE_MAPPACKS);
   if (!(await mappacksDb.findOne({ order: 0 })))
      return {
         http: {
            status: 400,
            message: "No pending pool available"
         }
      };

   const result = await mappacksDb.bulkWrite([
      {
         deleteMany: {
            // Keep packs for one week after they rotate out
            filter: { order: { $gt: ACTIVE_MAPPACKS } }
         }
      },
      {
         updateMany: {
            filter: {},
            update: { $inc: { order: 1 } }
         }
      }
   ]);
   console.log(result);
}
