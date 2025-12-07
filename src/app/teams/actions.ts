'use server';

import { auth } from "@/auth";
import { teamsDb } from "../api/db/connection";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { removePlayer } from "./functions";

export async function acceptInvite(teamId: string) {
   console.log("Accept invite", teamId);
   const session = await auth();
   if (!session?.user.id) return { http: { status: 401 } };

   const result = await teamsDb.updateOne(
      { _id: ObjectId.createFromHexString(teamId), "players.id": session.user.id },
      {
         $set: {
            "players.$.pending": false
         }
      }
   );
   console.log(result);

   revalidatePath("/teams");
}

export async function rejectInvite(teamId: string) {
   console.log("Reject invite", teamId);
   const session = await auth();
   if (!session?.user.id) return { http: { status: 401 } };

   await removePlayer(session.user.id, teamId);

   revalidatePath("/teams");
}