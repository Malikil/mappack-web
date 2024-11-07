"use server";

import db from "../api/db/connection";

export async function register(osuid) {
   console.log(`Register player ${osuid}`);
   const collection = db.collection("players");
   await collection.insertOne({
      osuid,
      pvp: {
         rating: 1500,
         rd: 350,
         vol: 0.06,
         matches: [],
         wins: 0,
         losses: 0
      },
      pve: {
         rating: 1500,
         rd: 350,
         vol: 0.06,
         matches: []
      }
   });
}
