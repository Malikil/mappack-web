"use server";

import { fruitsDb, maniaDb, osuDb, playersDb, taikoDb } from "@/app/api/db/connection";

export async function debug() {
   const result = await fruitsDb.updateMany({}, [
      {
         $set: {
            styles: {
               $map: {
                  input: { $range: [0, 6] },
                  as: "i",
                  in: {
                     $subtract: [{ $multiply: [{ $rand: {} }, 0.02] }, 0.01]
                  }
               }
            }
         }
      }
   ]);
   console.log(result);
}
