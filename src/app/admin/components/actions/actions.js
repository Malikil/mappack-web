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
   if (!(await collection.findOne({ active: "pending" })))
      return {
         http: {
            status: 400,
            message: "No pending pool available"
         }
      };

   const result = await collection.bulkWrite([
      {
         deleteMany: {
            filter: { active: "stale" }
         }
      },
      {
         updateMany: {
            filter: { active: "completed" },
            update: { $set: { active: "stale" } }
         }
      },
      {
         updateMany: {
            filter: { active: "current" },
            update: { $set: { active: "completed" } }
         }
      },
      {
         updateMany: {
            filter: { active: "pending" },
            update: { $set: { active: "current" } }
         }
      }
   ]);
   console.log(result);
}
