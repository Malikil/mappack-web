"use server";

import { verify } from "../../functions";
import db from "@/app/api/db/connection";

/**
 * @param {object} data
 * @param {boolean} data.submissionsOpen
 * @param {number} data.minStars
 * @param {number} data.maxStars
 */
export async function saveSubmissionSettings(data) {
   await verify();
   const metaCollection = db.collection("requirements");
   const result = await metaCollection.updateOne(
      {},
      {
         $set: {
            submissionsOpen: data.submissionsOpen,
            "maps.stars.min": data.minStars,
            "maps.stars.max": data.maxStars
         }
      }
   );
   return !!result.modifiedCount;
}
