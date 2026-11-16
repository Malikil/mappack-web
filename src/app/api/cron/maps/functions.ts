import { mapsDb } from "@/database/connection";
import { getOsuToken } from "@/helpers/osuToken";
import { BeatmapByMode, AnyBeatmapType } from "@/types/database/beatmap";
import { MergeUnion } from "@/types/general";
import { AnyBulkWriteOperation, Collection, Filter } from "mongodb";
import { GameMode, Beatmap, Fails, Beatmapset, Client } from "osu-web.js";

export async function fetchUpdatesForMode<M extends GameMode>(
   mode: M,
   cutoff: Date,
   client: Client,
   collection: Collection<BeatmapByMode[M]>
) {
   type MapType = BeatmapByMode[M];
   const updateMaps = await collection
      .find({ lastQuery: { $lt: cutoff } } as Filter<MapType>, { sort: { lastQuery: 1 }, limit: 15 })
      .toArray();
   console.log(`Updating ${updateMaps.length} ${mode} maps`);
   if (updateMaps.length < 1) return 0;
   const mapResults = await client.beatmaps
      .getBeatmaps({ query: { ids: updateMaps.map(m => m._id) } })
      .catch(err => {
         console.error(`Failed to fetch maps for ${mode}`, err);
      });
   if (!mapResults) return -1;
   // Update maps
   const updates: AnyBulkWriteOperation<MapType>[] = [];
   for (const osuBeatmap of mapResults) {
      try {
         const setMapUpdate = await projectBeatmapToDbShape(mode, osuBeatmap, client);
         if (setMapUpdate)
            updates.push({
               updateOne: {
                  filter: { _id: osuBeatmap.id } as Filter<MapType>,
                  update: { $set: setMapUpdate }
               }
            });
      } catch (err) {
         console.error(`Failed to create update for ${osuBeatmap.id}:`, err);
         break;
      }
   }
   // Remove maps that have been deleted
   const missing = updateMaps
      .filter(m => {
         const apiMap = mapResults.find(obm => obm.id === m._id);
         // Deleted || soft deleted
         return !apiMap || apiMap.total_length < 1;
      })
      .map(m => m._id);
   if (missing.length > 0)
      updates.push({ deleteMany: { filter: { _id: { $in: missing } } as Filter<MapType> } });
   if (updates.length > 0) {
      const result = await mapsDb[mode].bulkWrite(updates);
      console.log(result);
   }
   return updates.length;
}

export async function projectBeatmapToDbShape<M extends GameMode>(
   mode: M,
   osuBeatmap: Beatmap & {
      failtimes: Fails;
      max_combo: number;
      checksum: string | null;
      beatmapset: Beatmapset & {
         ratings: number[];
      };
   },
   client: Client = null
): Promise<Partial<BeatmapByMode[M]>> {
   if (!client) client = new Client(await getOsuToken());

   // If this is a convert, get the correct stats
   if (mode === "fruits" && osuBeatmap.mode === "osu") {
      const ctbStats = await client.beatmaps.getBeatmapAttributes(osuBeatmap.id, mode);
      osuBeatmap.difficulty_rating = ctbStats.star_rating;
      osuBeatmap.max_combo = ctbStats.max_combo;
      osuBeatmap.convert = true;
   }
   // Get star ratings for difficulty mods
   // Always get dt
   const dtStats = await client.beatmaps.getBeatmapAttributes(osuBeatmap.id, mode, {
      body: { mods: ["DT"] }
   });
   const stars: {
      nm: number;
      dt: number;
      hr?: number;
      hd?: number;
   } = {
      nm: osuBeatmap.difficulty_rating,
      dt: dtStats.star_rating
   };
   // osu is the only gamemode where HD affects stars
   if (mode === "osu") {
      const hdStats = await client.beatmaps.getBeatmapAttributes(osuBeatmap.id, mode, {
         body: { mods: ["HD"] }
      });
      stars.hd = hdStats.star_rating;
   }
   // mania is the only gamemode where HR *does not* affect stars
   if (mode !== "mania") {
      const hrStats = await client.beatmaps.getBeatmapAttributes(osuBeatmap.id, mode, {
         body: { mods: ["HR"] }
      });
      stars.hr = hrStats.star_rating;
   }
   const setMapUpdate: MergeUnion<AnyBeatmapType> = {
      artist: osuBeatmap.beatmapset.artist,
      title: osuBeatmap.beatmapset.title,
      version: osuBeatmap.version,
      mapper: osuBeatmap.beatmapset.creator,
      stars,
      length: osuBeatmap.total_length,
      bpm: osuBeatmap.bpm,
      maxCombo: osuBeatmap.max_combo,
      noteCount: {
         circles: osuBeatmap.count_circles,
         sliders: osuBeatmap.count_sliders
      },
      lastQuery: new Date()
   };
   // Additional mode-specific properties
   if (mode === "osu" || mode === "fruits") {
      setMapUpdate.ar = osuBeatmap.ar;
      setMapUpdate.cs = osuBeatmap.cs;
   }
   if (mode !== "fruits") {
      setMapUpdate.od = osuBeatmap.accuracy;
   }
   if (mode === "mania") {
      setMapUpdate.keys = osuBeatmap.cs;
   }

   return setMapUpdate as Partial<BeatmapByMode[M]>;
}
