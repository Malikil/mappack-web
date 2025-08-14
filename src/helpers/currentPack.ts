import { mappacksDb, mapsDb } from "@/app/api/db/connection";
import { AnyBeatmap, ModeCollectionMap } from "@/types/database.beatmap";
import { DbMappack } from "@/types/database.mappack";
import { GameMode } from "osu-web.js";
import { addMapsToDatabase } from "./addPool";
import { getOsuToken } from "./osuToken";

export async function getMaplist(mode: GameMode, maps: number[]) {
   const maplist: AnyBeatmap[] = await mapsDb[mode].find({ _id: { $in: maps } }).toArray();
   // Get map info for any maps not in the database
   const missing = maps.filter(m => !maplist.find(exist => exist._id === m));
   console.log("missing", missing);
   if (missing.length > 0) maplist.push(...(await addMapsToDatabase(await getOsuToken(), mode, missing)));
   return maplist;
}

export async function getCurrentPack<M extends GameMode>(mode: M) {
   const pools = await mappacksDb
      .aggregate<Omit<DbMappack, "maps"> & { maps: ModeCollectionMap[M][] }>([
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
   return maps;
}

export async function getPreviousPack<M extends GameMode>(mode: M) {
   const pools = await mappacksDb
      .aggregate<Omit<DbMappack, "maps"> & { maps: ModeCollectionMap[M][] }>([
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
