import { playersDb } from "@/app/api/db/connection";
import { Client, GameMode } from "osu-web.js";
import { getOsuToken } from "../osuToken";
import { DbPlayer, ModeInfo } from "@/types/database.player";
import { batchArray } from "../list-splitter";
import { delay, seconds } from "@/time";

export async function registerPlayer(osuid: number, osuname: string) {
   const pve = {
      rating: 1500,
      rd: 350,
      vol: 0.06,
      games: 0,
      songs: 0,
      matches: []
   };
   const styles = Array.from({ length: parseInt(process.env.SKILL_CATEGORIES) }, () => Math.random() / 100);
   const player = await playersDb.findOneAndUpdate(
      { _id: osuid },
      {
         $set: {
            osuname,
            osu: { pve, styles, pools: [] },
            fruits: { pve, styles, pools: [] },
            taiko: { pve, styles, pools: [] },
            mania: { pve, styles, pools: [] }
         },
         $unset: { hideLeaderboard: "" }
      },
      { upsert: true, returnDocument: "after" }
   );
   return player;
}

export async function createPvpRegistration(osuid: number, mode: GameMode = "osu") {
   const player = await playersDb.findOneAndUpdate(
      { _id: osuid, [`${mode}.pvp`]: { $exists: false } },
      {
         $set: {
            [`${mode}.pvp`]: {
               rating: 1500,
               rd: 350,
               vol: 0.06,
               matches: [],
               wins: 0,
               losses: 0
            }
         }
      },
      { returnDocument: "after" }
   );
   return player;
}

export async function getPlayerList(playerIds: number[], mode: GameMode = "osu", createPvP = false) {
   const existingPlayers: DbPlayer[] = await playersDb.find({ _id: { $in: playerIds } }).toArray();
   const missingIds = playerIds.filter(pid => !existingPlayers.find(p => p._id === pid));
   const addedPlayers: DbPlayer[] = [];
   if (missingIds.length > 0) {
      const client = new Client(await getOsuToken());
      const addingUsers: DbPlayer[] = [];
      let panic = false;
      for (const batch of batchArray(missingIds)) {
         console.log(`Get ${batch.length} players from bancho`);
         const banchoUsers = await client.users.getUsers({ query: { ids: batch } }).catch(err => {
            console.error(err);
            return { panic: true };
         });
         if ("panic" in banchoUsers) {
            panic = true;
            break;
         }

         const ratingSet: ModeInfo = {
            pve: {
               rating: 1500,
               rd: 350,
               vol: 0.06,
               matches: [],
               games: 0,
               songs: 0
            },
            styles: Array.from({ length: parseInt(process.env.SKILL_CATEGORIES) }, () => Math.random() / 100),
            pools: []
         };
         addingUsers.push(
            ...banchoUsers.map(bu => ({
               _id: bu.id,
               osuname: bu.username,
               osu: ratingSet,
               fruits: ratingSet,
               taiko: ratingSet,
               mania: ratingSet
            }))
         );
         console.log(`Done! Now ${addingUsers.length} total`);
         const iteration = ((addingUsers.length / 50) | 0) % 4;
         if (!iteration) {
            const n = addingUsers.length / 200;
            const s = Math.min(((n * (n + 1)) / 2) | 0, 20);
            console.log(`Cool down! ${s.toFixed(1)} seconds`);
            await delay(seconds(s));
         }
      }
      // Done looking everyone up, add to db
      if (addingUsers.length > 0) {
         const addPlayerResult = await playersDb.insertMany(addingUsers);
         console.log(addPlayerResult);
      }
      // Add to the player list
      addedPlayers.push(...addingUsers);

      // Stop the function if we hit an error
      if (panic) throw new Error("Failed to fetch players");
   }
   let playerList = existingPlayers.concat(addedPlayers);
   // Add pvp stats if requested
   if (createPvP)
      playerList = await Promise.all(
         playerList.map(p => {
            if (p[mode].pvp) return p;
            else return createPvpRegistration(p._id, mode);
         })
      );

   return playerList;
}
