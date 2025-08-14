"use server";

import { mappacksDb, playersDb } from "@/app/api/db/connection";
import { auth } from "@/auth";
import { mapsDb } from "@/app/api/db/connection";
import { AnyBeatmap, OsuBeatmap } from "@/types/database.beatmap";
import { GameMode } from "osu-web.js";
import { ModRatings, SimpleMod } from "@/types/rating";

function scalingsData(mode: GameMode) {
   const adding = ["$ratings.nm.rd", "$ratings.dt.rd"];
   if (mode !== "mania") adding.push("$ratings.hd.rd", "$ratings.hr.rd");
   return mapsDb[mode].aggregate<AnyBeatmap & { rdSum: number }>([
      {
         $addFields: {
            rdSum: { $add: adding }
         }
      },
      { $match: { rdSum: { $lt: mode === "mania" ? 300 : 400 } } },
      { $sort: { rdSum: 1 } },
      { $limit: 1000 }
   ]);
}
function recentPackData(mode: GameMode) {
   return mappacksDb.aggregate<AnyBeatmap>([
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
   const mode = session ? (await playersDb.findOne({ osuid: session.user.id })).gamemode || "osu" : "osu";
   const maps = type === "recent" ? recentPackData(mode) : scalingsData(mode);
   const modRatios = {
      hd: 0,
      hr: 0,
      dt: 0
   };
   const chartData = { nm: [], hd: [], hr: [], dt: [] };
   for await (const map of maps) {
      const { nm, hd, hr, dt } = map.ratings as ModRatings<SimpleMod>;
      modRatios.hd += hd?.rating / nm.rating;
      modRatios.hr += hr?.rating / nm.rating;
      modRatios.dt += dt.rating / nm.rating;
      Object.keys(map.ratings).forEach(k => {
         chartData[k].push({
            x: map.stars,
            y: map.ratings[k].rating,
            label: `${map.artist} - ${map.title} [${map.version}]`
         });
      });
   }

   return {
      hd: modRatios.hd / chartData.hd.length,
      hr: modRatios.hr / chartData.hr.length,
      dt: modRatios.dt / chartData.dt.length,
      mapCount: chartData.nm.length,
      chart: [
         {
            label: "NoMod",
            data: chartData.nm,
            borderColor: "#00EEEE",
            backgroundColor: "#00FFFF"
         },
         {
            label: "Hidden",
            data: chartData.hd,
            borderColor: "#EEEE00",
            backgroundColor: "#FFFF00"
         },
         {
            label: "HardRock",
            data: chartData.hr,
            borderColor: "#EE9400",
            backgroundColor: "#FFA500"
         },
         {
            label: "DoubleTime",
            data: chartData.dt,
            borderColor: "#EE00EE",
            backgroundColor: "#FF00FF"
         }
      ]
   };
}
