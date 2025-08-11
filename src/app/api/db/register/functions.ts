import { PvEInfo } from "@/types/database.player";
import { playersDb } from "../connection";

export async function register(osuid: number, osuname: string) {
   console.log(`Register player ${osuid}`);
   const pve: PvEInfo = {
      rating: 1500,
      rd: 350,
      vol: 0.06,
      games: 0,
      songs: 0,
      matches: [],
      bestPlays: []
   };
   const player = await playersDb.findOneAndUpdate(
      { osuid },
      {
         $set: {
            osuname,
            osu: { pve },
            fruits: { pve },
            taiko: { pve },
            mania: { pve }
         },
         $unset: { hideLeaderboard: "" }
      },
      { upsert: true, returnDocument: "after" }
   );
   return player;
}
