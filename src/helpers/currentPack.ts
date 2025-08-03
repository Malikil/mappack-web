import { mappacksDb, mapsDb } from "@/app/api/db/connection";
import { DbBeatmap } from "@/types/database.beatmap";
import { DbMappack } from "@/types/database.mappack";
import { GameMode } from "osu-web.js";
import { addMapsToDatabase } from "./addPool";
import { getOsuToken } from "./osuToken";

export async function getMaplist(maps: { id: number; mode: GameMode }[]) {
   const maplist: DbBeatmap[] = await mapsDb.find({ $or: maps }).toArray();
   // Get map info for any maps not in the database
   const missing = maps.filter(m => !maplist.find(exist => exist.id === m.id && exist.mode === m.mode));
   console.log("missing", missing);
   if (missing.length > 0) maplist.push(...(await addMapsToDatabase(await getOsuToken(), missing)));
   return maplist;
}

export async function getCurrentPack(mode: GameMode = "osu") {
   const pools = await mappacksDb
      .aggregate<Omit<DbMappack, "maps"> & { maps: DbBeatmap[] }>([
         { $match: { mode, $or: [{ active: "fresh" }, { active: "stale" }] } },
         {
            $lookup: {
               from: "maps",
               localField: "maps",
               foreignField: "id",
               pipeline: [{ $match: { mode } }, { $project: { _id: 0 } }],
               as: "maps"
            }
         }
      ])
      .toArray();
   //const pools = await mappacksDb.find({ mode,  }).toArray();
   const maps = ([] as DbBeatmap[]).concat(...pools.map(p => p.maps));
   return maps;
}

export async function getPreviousPack(mode: GameMode) {
   const pools = await mappacksDb
      .aggregate<Omit<DbMappack, "maps"> & { maps: DbBeatmap[] }>([
         { $match: { mode, active: "completed" } },
         {
            $lookup: {
               from: "maps",
               localField: "maps",
               foreignField: "id",
               pipeline: [{ $match: { mode } }],
               as: "maps"
            }
         }
      ])
      .toArray();
   return pools[0].maps;
}
