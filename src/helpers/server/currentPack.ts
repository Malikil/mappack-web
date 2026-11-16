import { mappacksDb, mapsDb } from "@/database/connection";
import { DbBeatmap } from "@/types/database.beatmap";
import { DbMappack } from "@/types/database.mappack";
import { GameMode } from "osu-web.js";
import { addMapsToDatabase } from "@/helpers/server/beatmaps";
import { AnyBeatmapType, BeatmapByMode, ManiaBeatmap } from "@/types/database/beatmap";

const ACTIVE_MAPPACKS = parseInt(process.env.ACTIVE_MAPPACKS);

/** @deprecated Use function from ./beatmaps */
export async function getMaplist(mode: GameMode, maps: number[]) {
   console.log(`Fetch ${maps.length} maps`);
   const maplist: AnyBeatmapType[] = await mapsDb[mode].find({ _id: { $in: maps } }).toArray();
   // Get map info for any maps not in the database
   const missing = maps.filter(m => !maplist.find(exist => exist._id === m));
   console.log(`Missing ${missing.length}`);
   if (missing.length > 0) maplist.push(...(await addMapsToDatabase(mode, missing)));
   return maplist;
}

export async function getCurrentPack<M extends GameMode>(mode: M, keyCount = 0): Promise<BeatmapByMode[M][]> {
   const pools = await mappacksDb
      .aggregate<Omit<DbMappack, "maps"> & { maps: BeatmapByMode[M][] }>([
         {
            $match: {
               mode,
               order: {
                  $gt: 0,
                  $lte: ACTIVE_MAPPACKS
               }
            }
         },
         {
            $lookup: {
               from: mode,
               localField: "maps",
               foreignField: "_id",
               as: "maps"
            }
         }
      ])
      .toArray();
   const maps = pools.flatMap(p => p.maps);
   if (mode === "mania" && keyCount) return maps.filter(m => "keys" in m && m.keys === keyCount);
   return maps;
}

export async function getPreviousPack<M extends GameMode>(mode: M) {
   const pools = await mappacksDb
      .aggregate<Omit<DbMappack, "maps"> & { maps: BeatmapByMode[M][] }>([
         { $match: { mode, order: ACTIVE_MAPPACKS + 1 } },
         {
            $lookup: {
               from: mode,
               localField: "maps",
               foreignField: "_id",
               as: "maps"
            }
         }
      ])
      .toArray();
   return pools[0].maps;
}
