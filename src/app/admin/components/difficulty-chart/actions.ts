"use server";

import { mappacksDb, playersDb } from "@/app/api/db/connection";
import { auth } from "@/auth";
import { DbBeatmap } from "@/types/database.beatmap";
import { GameMode } from "osu-web.js";
import { getMaplistForPredictor } from "@/helpers/server/predictor";

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

export async function fetchScatterData(type: "scaling" | "recent") {
   const session = await auth();
   const mode = session ? (await playersDb.findOne({ _id: session.user.id })).gamemode || "osu" : "osu";
   const maps = type === "scaling" ? getMaplistForPredictor(mode) : recentPackData(mode);
   const modRatios = {
      hd: 0,
      hr: 0,
      dt: 0
   };
   const modCounts = {
      hd: 0,
      hr: 0,
      dt: 0
   };
   const chartData = [];
   for await (const map of maps) {
      if (map.mods.HD) {
         modRatios.hd += map.mods.HD || 0;
         modCounts.hd++;
      }
      if (map.mods.HR) {
         modRatios.hr += map.mods.HR || 0;
         modCounts.hr++;
      }
      if (map.mods.DT) {
         modRatios.dt += map.mods.DT || 0;
         modCounts.dt++;
      }
      chartData.push({
         x: map.stars,
         y: map.rating.rating,
         label: `${map.artist} - ${map.title} [${map.version}]`
      });
   }

   return {
      hd: modRatios.hd / modCounts.hd,
      hr: modRatios.hr / modCounts.hr,
      dt: modRatios.dt / modCounts.dt,
      mapCount: chartData.length,
      chart: [
         {
            //label: "NoMod",
            data: chartData
            // borderColor: "#00EEEE",
            // backgroundColor: "#00FFFF"
         }
         // {
         //    label: "Hidden",
         //    data: chartData.hd,
         //    borderColor: "#EEEE00",
         //    backgroundColor: "#FFFF00"
         // },
         // {
         //    label: "HardRock",
         //    data: chartData.hr,
         //    borderColor: "#EE9400",
         //    backgroundColor: "#FFA500"
         // },
         // {
         //    label: "DoubleTime",
         //    data: chartData.dt,
         //    borderColor: "#EE00EE",
         //    backgroundColor: "#FF00FF"
         // }
      ]
   };
}
