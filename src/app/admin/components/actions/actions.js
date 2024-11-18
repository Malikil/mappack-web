"use server";

import db from "@/app/api/db/connection";
import { verify } from "../../functions";

export async function advancePack() {
   if (!(await verify()).session)
      return {
         http: {
            status: 401,
            message: "Not admin"
         }
      };

   const collection = db.collection("maps");
   const result = await collection.bulkWrite([
      {
         updateMany: {
            filter: { active: "current" },
            update: { $set: { active: "completed" } }
         }
      },
      {
         updateOne: {
            filter: { active: "pending" },
            update: { $set: { active: "current" } }
         }
      }
   ]);
   console.log(result);
}
