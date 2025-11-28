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
import { Beatmap, Beatmapset, Client, GameMode, LegacyClient } from "osu-web.js";
import { DbPlayer } from "@/types/database.player";
import { getPreviousMapScalings, prepBeatmapData } from "@/helpers/server/predictor";
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
      { $replaceRoot: { newRoot: "$maps" } },
      { $limit: 5 }
   ]);
}

export async function debug() {
   const predictor = await getPreviousMapScalings("fruits");
   const recentPack = recentPackData("fruits");
   const client = new Client(await getOsuToken());

   for await (const dbmap of recentPack) {
      console.log(`${dbmap.artist} - ${dbmap.title} [${dbmap.version}]`);
      console.log("\tReference:", dbmap.rating.rating, dbmap.mods);
      const osuBeatmap = await client.beatmaps.getBeatmap(dbmap._id);
      const data = prepBeatmapData(osuBeatmap, predictor);
      console.log("\t", data.rating.rating, data.mods);
   }
}
