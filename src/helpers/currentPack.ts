import { mappacksDb } from "@/app/api/db/connection";
import { DbBeatmap } from "@/types/database.beatmap";
import { DbMappack } from "@/types/database.mappack";
import { GameMode } from "osu-web.js";

export async function getCurrentPack(mode: GameMode = "osu") {
   const pools = await mappacksDb
      .aggregate<Omit<DbMappack, "maps"> & { maps: DbBeatmap[] }>([
         { $match: { mode, $or: [{ active: "fresh" }, { active: "stale" }] } },
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
