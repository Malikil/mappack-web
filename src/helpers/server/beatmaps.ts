import { mapsDb } from "@/app/api/db/connection";
import { DbBeatmap } from "@/types/database.beatmap";
import { Client, GameMode } from "osu-web.js";
import { getOsuToken } from "../osuToken";
import { getPreviousMapScalings, prepBeatmapData } from "./predictor";
import { batchArray } from "../list-splitter";

export async function getMaplist(mode: GameMode, maps: number[], client: Client = null) {
   console.log(`Fetch ${maps.length} maps`);
   const maplist: DbBeatmap[] = await mapsDb[mode].find({ _id: { $in: maps } }).toArray();
   // Get map info for any maps not in the database
   const missing = maps.filter(m => !maplist.find(exist => exist._id === m));
   console.log(`Missing ${missing.length}`);
   if (missing.length > 0)
      maplist.push(...(await addMapsToDatabase(mode, missing, client)));
   
   return maplist;
}

export async function addMapsToDatabase(
   mode: GameMode,
   maps: number[],
   client: Client = null
): Promise<DbBeatmap[]> {
   console.log("Fetch data for beatmaps list");
   // Get the map info from osu
   if (!client) client = new Client(await getOsuToken());
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
   if (resultList.length > 0) {
      const dbWriteResult = await mapsDb[mode]
         .insertMany(resultList, { ordered: false })
         .catch(err => console.warn(err));
      console.log(dbWriteResult);
   } else console.warn('Attempted to insert 0 maps', mode, maps);
   return resultList;
}
