import { NextRequest, NextResponse } from "next/server";
import { Beatmap, Beatmapset, Client, Fails, GameMode } from "osu-web.js";
import { mapsDb } from "../../db/connection";
import { AnyBulkWriteOperation, UpdateFilter } from "mongodb";
import { getOsuToken } from "@/helpers/osuToken";
import { DbBeatmap } from "@/types/database.beatmap";

export async function GET(req: NextRequest) {
   if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`)
      return new NextResponse("Unauthorized", { status: 401 });

   const accessToken = await getOsuToken();
   const client = new Client(accessToken);
   const now = new Date();
   const cutoff = new Date();
   cutoff.setMonth(cutoff.getMonth() - 1);
   for (const mode of ["osu", "fruits", "taiko", "mania"] as GameMode[]) {
      const updateMaps = await mapsDb[mode]
         .find({ lastQuery: { $lt: cutoff } }, { sort: { lastQuery: 1 }, limit: 50 })
         .toArray();
      console.log(`Updating ${updateMaps.length} ${mode} maps`);
      if (updateMaps.length < 1) continue;
      const mapResults = await client.beatmaps
         .getBeatmaps({ query: { ids: updateMaps.map(m => m._id) } })
         .catch(err => {
            console.error(`Failed to fetch maps for ${mode}`, err);
         });
      if (!mapResults) continue;
      // Update maps
      const updates: AnyBulkWriteOperation<DbBeatmap>[] = await Promise.all(
         mapResults.map(async osuBeatmap => {
            try {
               // If this is a convert, get the correct stats
               if (mode === "fruits" && osuBeatmap.mode === "osu") {
                  const ctbStats = await client.beatmaps.getBeatmapAttributes(osuBeatmap.id, mode);
                  osuBeatmap.difficulty_rating = ctbStats.star_rating;
                  osuBeatmap.max_combo = ctbStats.max_combo;
                  osuBeatmap.convert = true;
               }
               const setMapUpdate: Partial<DbBeatmap> = {
                  artist: osuBeatmap.beatmapset.artist,
                  title: osuBeatmap.beatmapset.title,
                  version: osuBeatmap.version,
                  mapper: osuBeatmap.beatmapset.creator,
                  stars: osuBeatmap.difficulty_rating,
                  length: osuBeatmap.total_length,
                  bpm: osuBeatmap.bpm,
                  ar: osuBeatmap.ar,
                  cs: osuBeatmap.cs,
                  maxCombo: osuBeatmap.max_combo,
                  noteCount: {
                     circles: osuBeatmap.count_circles,
                     sliders: osuBeatmap.count_sliders
                  }
               };
               // If the map is ranked, we don't need to keep dates anymore
               let unsetMapUpdate = null;
               if (osuBeatmap.ranked < 1) {
                  setMapUpdate.lastUpdate = new Date(osuBeatmap.last_updated);
                  setMapUpdate.lastQuery = now;
               } else
                  unsetMapUpdate = {
                     lastUpdate: "",
                     lastQuery: ""
                  };
               const update: UpdateFilter<DbBeatmap> = { $set: setMapUpdate };
               if (unsetMapUpdate) update.$unset = unsetMapUpdate;
               return {
                  updateOne: {
                     filter: { _id: osuBeatmap.id },
                     update
                  }
               };
            } catch (err) {
               console.error(`Failed to create update for ${osuBeatmap.id}:`, err);
            }
         })
      ).then(arr => arr.filter(v => v));
      // Remove maps that have been deleted
      const missing = updateMaps
         .filter(m => {
            const apiMap = mapResults.find(obm => obm.id === m._id);
            // Deleted || soft deleted
            return !apiMap || apiMap.total_length < 1;
         })
         .map(m => m._id);
      if (missing.length > 0) updates.push({ deleteMany: { filter: { _id: { $in: missing } } } });
      if (updates.length > 0) {
         const result = await mapsDb[mode].bulkWrite(updates);
         console.log(result);
      }
   }
}
