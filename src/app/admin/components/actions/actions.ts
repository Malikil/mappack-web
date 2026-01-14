"use server";

import { fruitsDb, maniaDb, osuDb, taikoDb } from "@/app/api/db/connection";
import { parse1v1Lobby } from "@/app/api/db/pvp/functions";
import { LegacyClient } from "osu-web.js";
import util from "util";

export async function debug() {
   const result = await taikoDb.updateMany(
      {},
      {
         $unset: {
            ratings: ""
         }
      }
   );
   console.log(result);
}
