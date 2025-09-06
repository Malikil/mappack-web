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
   const styles = Array.from({ length: parseInt(process.env.SKILL_CATEGORIES) }, () => Math.random() / 100);
   const player = await playersDb.findOneAndUpdate(
      { osuid },
      {
         $set: {
            osuname,
            osu: { pve, styles },
            fruits: { pve, styles },
            taiko: { pve, styles },
            mania: { pve, styles }
         },
         $unset: { hideLeaderboard: "" }
      },
      { upsert: true, returnDocument: "after" }
   );
   return player;
}
