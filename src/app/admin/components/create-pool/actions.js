"use server";

import { verify } from "../../functions";
import { checkExpiry } from "@/auth";
import { createMappool } from "@/helpers/addPool";

export async function addMappool(formData) {
   const { session } = await verify();
   if (!session)
      return {
         http: {
            status: 401,
            message: "Not admin"
         }
      };

   if (checkExpiry(session.accessToken))
      return {
         http: {
            status: 401,
            message: "Access token expired - please log in again"
         }
      };

   const packName = formData.get("packName");
   const download = formData.get("download");
   /** @type {number[]} */
   const mapsets = formData
      .get("maps")
      .split("\n")
      .map(v => parseInt(v))
      .filter(v => v);

   return createMappool(session.accessToken, packName, download, mapsets);
}
