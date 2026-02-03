import { playersDb } from "@/app/api/db/connection";
import { Client, GameMode } from "osu-web.js";
import { getOsuToken } from "../osuToken";
import { DbPlayer } from "@/types/database.player";
import { batchArray } from "../list-splitter";
import { delay, seconds } from "@/time";

export async function createPvpRegistration(osuid: number, mode: GameMode = "osu") {
   if (!mode) mode = "osu";
   console.log(`Create ${mode} pvp stats for ${osuid}`);
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

const N_SKILLS = parseInt(process.env.SKILL_CATEGORIES);
const SQRT_N = Math.sqrt(N_SKILLS);
function createModesInfo() {
   const pve = () => ({
      rating: 1500,
      rd: 350,
      vol: 0.06,
      matches: [],
      games: 0,
      songs: 0
   });
   const modeInfo = () => ({
      pve: pve(),
      styles: Array.from({ length: N_SKILLS }, () => ((Math.random() - 0.5) * SQRT_N) / 100),
      mods: {}
   });
   return {
      osu: modeInfo(),
      fruits: modeInfo(),
      taiko: modeInfo(),
      mania: modeInfo()
   };
}

export async function getPlayerList(
   players: (number | { id: number; username: string })[],
   mode: GameMode = "osu",
   createPvP = false,
   client: Client = null
) {
   // Split up known usernames
   const knownUsers = new Map<number, string>();
   const allIds: number[] = [];

   for (const p of players) {
      if (typeof p === "number") {
         allIds.push(p);
      } else {
         knownUsers.set(p.id, p.username);
         allIds.push(p.id);
      }
   }

   // Initial fetch existing players
   const existingPlayers = await playersDb.find({ _id: { $in: allIds } }).toArray();

   const existingIds = new Set(existingPlayers.map(p => p._id));
   console.log(`Found ${existingPlayers.length} of ${allIds.length} players`);
   // Create update statements for anyone whose username has changed, or are missing from the database
   if (knownUsers.size > 0) {
      console.log(
         await playersDb.bulkWrite(
            [...knownUsers.entries()].map(([id, username]) => ({
               updateOne: {
                  filter: { _id: id },
                  update: {
                     $set: { osuname: username },
                     $setOnInsert: createModesInfo()
                  },
                  upsert: true
               }
            }))
         )
      );
   }

   // See if we're still missing anyone at this point
   const idsNeedingApi = allIds.filter(id => !knownUsers.has(id) && !existingIds.has(id));

   const addedPlayers: DbPlayer[] = [];
   if (idsNeedingApi.length > 0) {
      if (!client) client = new Client(await getOsuToken());
      const addingUsers: DbPlayer[] = [];
      let panic = false;
      for (const batch of batchArray(idsNeedingApi)) {
         console.log(`Get ${batch.length} players from bancho`);
         const banchoUsers = await client.users.getUsers({ query: { ids: batch } }).catch(err => {
            console.error(err);
            return { panic: true };
         });
         if ("panic" in banchoUsers) {
            panic = true;
            break;
         }

         addingUsers.push(
            ...banchoUsers.map(bu => ({
               _id: bu.id,
               osuname: bu.username,
               ...createModesInfo()
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
   let playerList = await playersDb.find({ _id: { $in: allIds } }).toArray();
   // Add pvp stats if requested
   console.log(`Create pvp stats? ${createPvP}`);
   if (createPvP)
      playerList = await Promise.all(
         playerList.map(p => {
            if (p[mode].pvp) return p;
            else return createPvpRegistration(p._id, mode);
         })
      );

   return playerList;
}
