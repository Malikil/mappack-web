"use server";

import { convertTime } from "@/time";
import { verify } from "../../functions";
import db from "@/app/api/db/connection";
import { JWT } from "google-auth-library";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { buildUrl, getEnumMods } from "osu-web.js";

const SHEETS_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const jwt = new JWT({
   email: process.env.GOOGLE_SHEETS_SERVICE_EMAIL,
   key: process.env.GOOGLE_SHEETS_PRIVATE_KEY,
   scopes: SHEETS_SCOPES
});
const googleSheet = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_DOCUMENT_ID, jwt);

export async function advancePools() {
   await verify();
   console.log("Advance mappools");

   const result = await db.collection("players").updateMany({}, [
      {
         $set: {
            maps: {
               current: [],
               previous: {
                  $concatArrays: ["$maps.previous", "$maps.current"]
               }
            }
         }
      }
   ]);
   console.log(result);
}

export async function clearScreenshots() {
   await verify();
   console.log("Clear screenshots");
   const playersCollection = db.collection("players");
   const result = await playersCollection.updateMany(
      {},
      {
         $unset: { "maps.previous.$[].screenshot": "" }
      }
   );
   console.log(result);
}

export async function exportPools() {
   await verify();
   // Get data from db
   const cursor = db.collection("players").aggregate([
      {
         $match: {
            eliminated: { $exists: false }
         }
      },
      { $unwind: "$maps.current" },
      {
         $match: {
            "maps.current.approval": "approved"
         }
      },
      {
         $project: {
            _id: false,
            player: "$osuid",
            mods: "$maps.current.mods",
            mapper: "$maps.current.mapper",
            map: {
               $concat: [
                  "$maps.current.artist",
                  " - ",
                  "$maps.current.title",
                  " [",
                  "$maps.current.version",
                  "]"
               ]
            },
            stars: { $round: ["$maps.current.stars", 2] },
            drain: "$maps.current.drain",
            bpm: "$maps.current.bpm",
            id: "$maps.current.id"
         }
      },
      {
         $sort: {
            player: 1,
            mods: 1
         }
      }
   ]);
   const rows = cursor.map(doc => ({
      ...doc,
      mods: getEnumMods(doc.mods).join("") || "NM",
      drain: convertTime(doc.drain),
      map: `=HYPERLINK("${buildUrl.beatmap(doc.id)}","${doc.map}")`
   }));
   await googleSheet.loadInfo();
   const exportSheet = await googleSheet.addSheet({
      title: `Export ${Date.now()}`,
      headerValues: ["player", "mods", "mapper", "map", "stars", "drain", "bpm", "id"]
   });
   const rowResult = await exportSheet.addRows(await rows.toArray());
   console.log(rowResult[0]);
}
