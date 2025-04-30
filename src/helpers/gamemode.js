"use server";

import db from "@/app/api/db/connection";
import { auth } from "@/auth";

export async function changeGamemode(gamemode) {
   const session = await auth();
   if (!session) return;

   const playerCollection = db.collection("players");
   await playerCollection.updateOne(
      { osuid: session.user.id },
      {
         $set: {
            gamemode
         }
      }
   );
}
