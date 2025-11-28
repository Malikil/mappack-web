"use server";

import util from "util";
import db, {
   fruitsDb,
   historyDb,
   maniaDb,
   mapsDb,
   mpLinksDb,
   osuDb,
   playersDb,
   taikoDb
} from "@/app/api/db/connection";
import { batchCursor } from "@/helpers/list-splitter";
import { getOsuToken } from "@/helpers/osuToken";
import { Client } from "osu-web.js";
import { DbPlayer } from "@/types/database.player";
import { predictOutcome } from "@/helpers/server/ratings";

export async function debug() {
   // const result = await maniaDb.updateMany({ rating: { $exists: false } }, [
   //    {
   //       $set: {
   //          rating: "$ratings.nm",
   //          mods: {
   //             //HD: { $divide: ["$ratings.hd.rating", "$ratings.nm.rating"] },
   //             //HR: { $divide: ["$ratings.hr.rating", "$ratings.nm.rating"] },
   //             DT: { $divide: ["$ratings.dt.rating", "$ratings.nm.rating"] }
   //          }
   //       }
   //    }
   // ]);
   // console.log(result);
   const result = predictOutcome({ rating: 3000, rd: 50, vol: 0.06 }, { rating: 1000, rd: 50, vol: 0.06 });
   console.log(result);
}
