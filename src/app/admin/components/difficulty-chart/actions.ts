"use server";

import { playersDb } from "@/app/api/db/connection";
import { auth } from "@/auth";
import { mapsDb } from "@/app/api/db/connection";
import { DbBeatmap } from "@/types/database.beatmap";
//import { getCurrentPack } from "@/helpers/currentPack";

export async function fetchScatterData() {
   const session = await auth();
   const mode = session ? (await playersDb.findOne({ osuid: session.user.id })).gamemode || "osu" : "osu";
   const maps = mapsDb.aggregate<DbBeatmap & { rdSum: number }>([
      { $match: { mode } },
      {
         $addFields: {
            rdSum: { $add: ["$ratings.nm.rd", "$ratings.hd.rd", "$ratings.hr.rd", "$ratings.dt.rd"] }
         }
      },
      { $match: { rdSum: { $lt: 400 } } },
      { $sort: { rdSum: 1 } }
      //{ $limit: 1000 }
   ]);
   const modRatios = {
      hd: 0,
      hr: 0,
      dt: 0
   };
   const chartData = { nm: [], hd: [], hr: [], dt: [] };
   for await (const map of maps) {
      const { nm, hd, hr, dt } = map.ratings;
      modRatios.hd += hd.rating / nm.rating;
      modRatios.hr += hr.rating / nm.rating;
      modRatios.dt += dt.rating / nm.rating;
      Object.keys(chartData).forEach(k => {
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
