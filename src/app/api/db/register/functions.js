import db from "../connection";

export async function register(osuid, osuname) {
   console.log(`Register player ${osuid}`);
   const collection = db.collection("players");
   const pve = {
      rating: 1500,
      rd: 350,
      vol: 0.06,
      games: 0,
      matches: []
   };
   const player = await collection.findOneAndUpdate(
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
