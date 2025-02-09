"use server";

import db from "@/app/api/db/connection";

export async function fetchScatterData(mode) {
   const mapsDb = db.collection("maps");
   const pools = mapsDb.find({ mode });
   const modRatios = {
      hd: 0,
      hr: 0,
      dt: 0
   };
   const chartData = { nm: [], hd: [], hr: [], dt: [] };
   for await (const pool of pools) {
      console.log(pool);
      pool.maps.forEach(map => {
         const { nm, hd, hr, dt } = map.ratings;
         modRatios.hd += hd.rating / nm.rating;
         modRatios.hr += hr.rating / nm.rating;
         modRatios.dt += dt.rating / nm.rating;
         chartData.nm.push({
            x: map.stars,
            y: nm.rating,
            label: `${map.artist} - ${map.title} [${map.version}]`
         });
         chartData.hd.push({
            x: map.stars,
            y: hd.rating,
            label: `${map.artist} - ${map.title} [${map.version}]`
         });
         chartData.hr.push({
            x: map.stars,
            y: hr.rating,
            label: `${map.artist} - ${map.title} [${map.version}]`
         });
         chartData.dt.push({
            x: map.stars,
            y: dt.rating,
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
