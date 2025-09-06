import { mappacksDb, mapsDb } from "@/app/api/db/connection";
import { DbBeatmap } from "@/types/database.beatmap";
import { DbMappack } from "@/types/database.mappack";
import { GameMode } from "osu-web.js";
import { addMapsToDatabase } from "../addPool";
import { getOsuToken } from "../osuToken";

export async function getMaplist(mode: GameMode, maps: number[]) {
   console.log(`Get ${maps.length} maps`);
   const maplist: DbBeatmap[] = await mapsDb[mode].find({ _id: { $in: maps } }).toArray();
   // Get map info for any maps not in the database
   const missing = maps.filter(m => !maplist.find(exist => exist._id === m));
   console.log(`Missing ${missing.length}`);
   if (missing.length > 0) maplist.push(...(await addMapsToDatabase(await getOsuToken(), mode, missing)));
   return maplist;
}

export async function getCurrentPack<M extends GameMode>(mode: M, keyCount = 0) {
   const pools = await mappacksDb
      .aggregate<Omit<DbMappack, "maps"> & { maps: DbBeatmap[] }>([
         { $match: { mode, $or: [{ active: "fresh" }, { active: "stale" }] } },
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
   if (mode === "mania" && keyCount) return maps.filter(m => m.cs === keyCount);
   return maps;
}

export async function getPreviousPack(mode: GameMode) {
   const pools = await mappacksDb
      .aggregate<Omit<DbMappack, "maps"> & { maps: DbBeatmap[] }>([
         { $match: { mode, active: "completed" } },
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
