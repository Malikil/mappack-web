"use server";

import util from "util";
import db, {
   fruitsDb,
   historyDb,
   maniaDb,
   mappacksDb,
   mapsDb,
   mpLinksDb,
   osuDb,
   playersDb,
   taikoDb
} from "@/app/api/db/connection";
import { batchCursor } from "@/helpers/list-splitter";
import { getOsuToken } from "@/helpers/osuToken";
import { Client, GameMode } from "osu-web.js";
import { DbPlayer } from "@/types/database.player";
import { getPreviousMapScalings } from "@/helpers/server/predictor";
import { DbBeatmap } from "@/types/database.beatmap";

function recentPackData(mode: GameMode) {
   return mappacksDb.aggregate<DbBeatmap>([
      { $match: { mode, active: "fresh" } },
      {
         $lookup: {
            from: mode,
            localField: "maps",
            foreignField: "_id",
            as: "maps"
         }
      },
      {
         $project: {
            _id: 0,
            maps: 1
         }
      },
      { $unwind: "$maps" },
      { $replaceRoot: { newRoot: "$maps" } }
   ]);
}

export async function debug() {
   const predictor = await getPreviousMapScalings("fruits");
}
