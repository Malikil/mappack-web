"use server";

import { playersDb } from "@/database/connection";
import { auth } from "@/auth";

export async function changeGamemode(gamemode) {
   const session = await auth();
   if (!session) return;

   await playersDb.updateOne(
      { _id: session.user.id },
      {
         $set: {
            gamemode
         }
      }
   );
}
