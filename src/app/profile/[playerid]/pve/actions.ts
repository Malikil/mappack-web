"use server";

import { mpLinksDb } from "@/app/api/db/connection";
import { revalidatePath } from "next/cache";
import { submitPveData } from "@/helpers/server/pve";
import { auth, checkExpiry } from "@/auth";
import { Client } from "osu-web.js";
import { getLobbyData } from "@/helpers/server/multiplayer";

export async function submitPve(formData: FormData) {
   const session = await auth();
   if (!session || checkExpiry(session.accessToken))
      return {
         http: {
            status: 400,
            message: "Access token expired"
         }
      };
   const mpLink = formData.get("mp").toString();
   const matchIdSegment = parseInt(mpLink.slice(mpLink.lastIndexOf("/") + 1));
   console.log(`Submit PvE ${matchIdSegment}`);
   if (await mpLinksDb.findOne({ _id: matchIdSegment }))
      return {
         http: {
            status: 400,
            message: "MP link already submitted"
         }
      };
   const client = new Client(session.accessToken);
   const lobby = await getLobbyData(matchIdSegment, client);
   const success = await submitPveData(lobby);
   if (!success)
      return {
         http: {
            status: 400,
            message: "Please finish the lobby before submitting"
         }
      };
   // Add the mp link to history
   mpLinksDb.insertOne({ _id: matchIdSegment });

   revalidatePath("/profile");
}
