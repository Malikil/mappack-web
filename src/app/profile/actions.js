"use server";

import db from "../api/db/connection";

export async function register(osuid, osuname) {
   console.log(`Register player ${osuid}`);
   const collection = db.collection("players");
   await collection.updateOne(
      { osuid },
      {
         $set: {
            osuname,
            osu: {},
            fruits: {},
            taiko: {},
            mania: {}
         },
         $unset: { hideLeaderboard: "" }
      },
      { upsert: true }
   );
}
