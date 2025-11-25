"use server";

import { mpLinksDb } from "@/app/api/db/connection";
import { revalidatePath } from "next/cache";
import { parseMpLobby, submitPveData } from "./functions";

export async function submitPve(formData: FormData) {
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
   const data = await parseMpLobby(matchIdSegment);
   if (!data)
      return {
         http: {
            status: 400,
            message: "Please finish the lobby before submitting"
         }
      };
   if (Object.keys(data.matches).length < 1)
      return {
         http: {
            status: 400,
            message: "No songs found"
         }
      };
   // Add the mp link to history
   mpLinksDb.insertOne({ _id: matchIdSegment });
   console.log(data.matches);
   try {
      await submitPveData(data);
   } catch (err) {
      console.warn(err);
      return {
         http: {
            status: 500,
            message: "Failed to fetch player information"
         }
      };
   }

   revalidatePath("/profile");
}
