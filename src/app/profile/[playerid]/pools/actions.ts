"use server";

import { mapsDb, playersDb } from "@/app/api/db/connection";
import { getMaplist } from "@/helpers/server/currentPack";
import { DbBeatmap } from "@/types/database.beatmap";
import { revalidatePath } from "next/cache";
import { GameMode, Mod } from "osu-web.js";

export async function addPool(osuid: number, mode: GameMode) {
   const result = await playersDb.updateOne(
      { _id: osuid, [`${mode}.pools.name`]: { $ne: "" } },
      {
         $push: {
            [`${mode}.pools`]: {
               name: "",
               maps: []
            }
         }
      }
   );
   console.log(result);

   revalidatePath("/profile");
}

export async function removePool(osuid: number, mode: GameMode, poolname: string) {
   const result = await playersDb.updateOne(
      { _id: osuid },
      { $pull: { [`${mode}.pools`]: { name: poolname } } }
   );
   console.log(result);

   revalidatePath("/profile");
}

export async function savePool(
   osuid: number,
   mode: GameMode,
   oldName: string,
   newName: string,
   maps: { map: DbBeatmap; mods?: Mod[] }[]
) {
   if (oldName !== newName) {
      const nameConflict = await playersDb.findOne({ osuid, [`${mode}.pools.name`]: newName });
      if (nameConflict) throw new Error("Pool name already exists");
   }
   const oldPool = (await playersDb.findOne({ _id: osuid }))[mode].pools.find(p => p.name === oldName);
   const maplist = await getMaplist(
      mode,
      maps.map(m => m.map._id).filter(v => v)
   );
   const updatedPool = {
      name: newName,
      maps: maplist.map(m => ({
         map: m,
         mods: maps.find(mapMod => mapMod.map._id === m._id).mods,
         scores: oldPool.maps.find(om => om.id === m._id)?.scores || []
      }))
   };

   const result = await playersDb.updateOne(
      { _id: osuid, [`${mode}.pools.name`]: oldName },
      {
         $set: {
            [`${mode}.pools.$`]: {
               name: newName,
               maps: updatedPool.maps.map(m => ({ id: m.map._id, mods: m.mods, scores: m.scores }))
            }
         }
      }
   );
   console.log(result);

   return updatedPool;
}

export async function fetchMapFromDb(id: number, mode: GameMode) {
   const map = await mapsDb[mode].findOne({ _id: id });
   return map;
}
