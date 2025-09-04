"use server";

import util from "util";
import { fruitsDb, historyDb, mpLinksDb, playersDb } from "@/app/api/db/connection";
import { batchCursor } from "@/helpers/list-splitter";
import { getOsuToken } from "@/helpers/osuToken";
import { Client } from "osu-web.js";
import { DbPlayer } from "@/types/database.player";

export async function debug() {
   const result = await playersDb.updateMany({}, [
      {
         $set: {
            "osu.styles": {
               $map: {
                  input: { $range: [0, 6] },
                  as: "index",
                  in: { $divide: [{ $rand: {} }, 100] }
               }
            },
            "fruits.styles": {
               $map: {
                  input: { $range: [0, 6] },
                  as: "index",
                  in: { $divide: [{ $rand: {} }, 100] }
               }
            },
            "taiko.styles": {
               $map: {
                  input: { $range: [0, 6] },
                  as: "index",
                  in: { $divide: [{ $rand: {} }, 100] }
               }
            },
            "mania.styles": {
               $map: {
                  input: { $range: [0, 6] },
                  as: "index",
                  in: { $divide: [{ $rand: {} }, 100] }
               }
            }
         }
      }
   ]);
   console.log(result);
}
