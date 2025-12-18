import { playersDb } from "../connection";

export async function register(osuid: number, osuname: string) {
   console.log(`Register player ${osuid}`);
   const pve = {
      rating: 1500,
      rd: 350,
      vol: 0.06,
      games: 0,
      songs: 0,
      matches: []
   };
   const styles = Array.from(
      { length: parseInt(process.env.SKILL_CATEGORIES) },
      () => Math.random() * 0.02 - 0.01
   );
   const player = await playersDb.findOneAndUpdate(
      { _id: osuid },
      {
         $set: {
            osuname,
            osu: { pve, styles, mods: {} },
            fruits: { pve, styles, mods: {} },
            taiko: { pve, styles, mods: {} },
            mania: { pve, styles, mods: {} }
         },
         $unset: { hideLeaderboard: "" }
      },
      { upsert: true, returnDocument: "after" }
   );
   return player;
}
