"use server";

import db from "@/app/api/db/connection";

export async function fetchScatterData() {
   const mapsDb = db.collection("maps");
   const pools = mapsDb.find({ active: { $ne: "pending" } });
   const modRatios = {
      hd: 0,
      hr: 0,
      dt: 0
   };
   const chartData = { nm: [], hd: [], hr: [], dt: [] };
   for await (const pool of pools) {
      pool.maps.forEach(map => {
         const { nm, hd, hr, dt } = map.ratings;
         modRatios.hd += hd.rating / nm.rating;
         modRatios.hr += hr.rating / nm.rating;
         modRatios.dt += dt.rating / nm.rating;
         chartData.nm.push({
            x: map.stars,
            y: nm.rating
         });
         chartData.hd.push({
            x: map.stars,
            y: hd.rating
         });
         chartData.hr.push({
            x: map.stars,
            y: hr.rating
         });
         chartData.dt.push({
            x: map.stars,
            y: dt.rating
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
            data: chartData.nm,
            borderColor: "#00DDDD",
            backgroundColor: "#00FFFF"
         },
         {
            data: chartData.hd,
            borderColor: "#DDDD00",
            backgroundColor: "#FFFF00"
         },
         {
            data: chartData.hr,
            borderColor: "#DD8300",
            backgroundColor: "#FFA500"
         },
         {
            data: chartData.dt,
            borderColor: "#DD00DD",
            backgroundColor: "#FF00FF"
         }
      ]
   };
}
