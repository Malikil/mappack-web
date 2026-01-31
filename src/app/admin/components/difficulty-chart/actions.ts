"use server";

import { mappacksDb, playersDb } from "@/app/api/db/connection";
import { auth } from "@/auth";
import { DbBeatmap } from "@/types/database.beatmap";
import { GameMode } from "osu-web.js";
import { getMaplistForPredictor } from "@/helpers/server/predictor";
import { AggregationCursor } from "mongodb";

function recentPackData(mode: GameMode) {
   return mappacksDb.aggregate<DbBeatmap & { order: number; packName: string }>([
      { $match: { mode, order: { $gt: 0, $lte: parseInt(process.env.ACTIVE_MAPPACKS) } } },
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
            order: 1,
            name: 1,
            maps: 1
         }
      },
      { $unwind: "$maps" },
      { $replaceRoot: { newRoot: { $mergeObjects: ["$maps", { packName: "$name", order: "$order" }] } } }
   ]);
}

export async function fetchScatterData(type: "scaling" | "recent") {
   const session = await auth();
   const mode = session ? (await playersDb.findOne({ _id: session.user.id })).gamemode || "osu" : "osu";
   const maps: AggregationCursor<DbBeatmap & { order?: number; packName?: string }> =
      type === "scaling" ? getMaplistForPredictor(mode) : recentPackData(mode);
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
   const chartData: {
      label?: string;
      data: { x: number; y: number; label: string }[];
      borderColor?: string;
      backgroundColor?: string;
   }[] = [{ data: [] }];
   for await (const map of maps) {
      if (map.mods.HD) {
         modRatios.hd += map.mods.HD;
         modCounts.hd++;
      }
      if (map.mods.HR) {
         modRatios.hr += map.mods.HR;
         modCounts.hr++;
      }
      if (map.mods.DT) {
         modRatios.dt += map.mods.DT;
         modCounts.dt++;
      }
      if ("order" in map) {
         const i = map.order - 1;
         // Make sure the dataset is valid
         if (!chartData[i]) chartData[i] = { data: [] };
         if (!("label" in chartData[i])) chartData[i].label = map.packName;
         chartData[i].data.push({
            x: map.stars,
            y: map.rating.rating,
            label: `${map.artist} - ${map.title} [${map.version}]`
         });
      } // Only one dataset, no label needed
      else
         chartData[0].data.push({
            x: map.stars,
            y: map.rating.rating,
            label: `${map.artist} - ${map.title} [${map.version}]`
         });
   }

   return {
      hd: modRatios.hd / modCounts.hd,
      hr: modRatios.hr / modCounts.hr,
      dt: modRatios.dt / modCounts.dt,
      mapCount: chartData.reduce((p, c) => p + c.data.length, 0),
      chart: chartData //[
      //{
      //label: "NoMod",
      // data: chartData
      // borderColor: "#00EEEE",
      // backgroundColor: "#00FFFF"
      //}
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
      //]
   };
}
