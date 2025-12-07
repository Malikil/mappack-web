"use server";

import { mapsDb, playersDb, teamsDb } from "@/app/api/db/connection";
import { auth } from "@/auth";
import { getMaplist } from "@/helpers/server/currentPack";
import { DbBeatmap } from "@/types/database.beatmap";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { GameMode, Mod } from "osu-web.js";

export async function addPool(teamid: string) {
   const session = await auth();
   if (!(session?.user.id)) return { http: { status: 401 } };
   const result = await teamsDb.updateOne(
      { _id: ObjectId.createFromHexString(teamid), 'players.id': session.user.id, 'pools.name': { $ne: 'New Pool' } },
      {
         $push: {
            pools: {
               name: "New Pool",
               maps: []
            }
         }
      }
   );
   console.log(result);

   revalidatePath(`/teams/${teamid}`);
}

export async function removePool(teamid: string, poolname: string) {
   const session = await auth();
   if (!(session?.user.id)) return { http: { status: 401 }};

   const result = await teamsDb.updateOne(
      { _id: ObjectId.createFromHexString(teamid), 'players.id': session.user.id },
      { $pull: { pools: { name: poolname } } }
   );
   console.log(result);

   revalidatePath(`/teams/${teamid}`);
}

export async function savePool(
   teamid: string,
   oldName: string,
   newName: string,
   maps: { map: { _id: number }; mods?: Mod[] }[]
) {
   const session = await auth();
   if (!(session?.user.id)) throw new Error('401');
   console.log(teamid);
   const teamObjectId = ObjectId.createFromHexString(teamid);
   
   const team = await teamsDb.findOne({ _id: teamObjectId, 'players.id': session.user.id });

   if (oldName !== newName) {
      const nameConflict = team.pools.some(p => p.name === newName);
      if (nameConflict) throw new Error("Pool name already exists");
   }
   const oldPool = team.pools.find(p => p.name === oldName);
   const maplist = await getMaplist(
      team.mode,
      maps.map(m => m.map._id).filter(v => v)
   );
   const updatedPool = {
      name: newName,
      maps: maplist.map(m => ({
         map: m,
         mods: maps.find(mapMod => mapMod.map._id === m._id).mods,
         scores: oldPool.maps.find(om => om.id === m._id)?.scores || {}
      }))
   };

   const result = await teamsDb.updateOne(
      { _id: teamObjectId, 'pools.name': oldName },
      {
         $set: {
            'pools.$': {
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
