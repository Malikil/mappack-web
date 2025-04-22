"use server";

import { verify } from "../../functions";
import { cyclePools } from "@/helpers/addPool";

export async function advancePack() {
   if (!(await verify()).session)
      return {
         http: {
            status: 401,
            message: "Not admin"
         }
      };

   return cyclePools();
}
