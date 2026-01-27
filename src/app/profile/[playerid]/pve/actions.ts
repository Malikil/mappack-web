"use server";

import { mpLinksDb } from "@/app/api/db/connection";
import { revalidatePath } from "next/cache";
import { submitPveData } from "@/helpers/server/pve";

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
   const success = await submitPveData(matchIdSegment);
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
