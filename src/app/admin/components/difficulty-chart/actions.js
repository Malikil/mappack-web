"use server";

import db from "@/app/api/db/connection";

export async function fetchScatterData() {
   const mapsDb = db.collection("maps");
   const pool = await mapsDb.findOne({ active: "current" });
   const modRatios = {
      hd: 0,
      hr: 0,
      dt: 0
   };
   const chartData = pool.maps.map(map => {
      const { nm, hd, hr, dt } = map.ratings;
      modRatios.hd += hd.rating / nm.rating;
      modRatios.hr += hr.rating / nm.rating;
      modRatios.dt += dt.rating / nm.rating;
      return {
         x: map.stars,
         y: nm.rating
      };
   });

   return {
      hd: modRatios.hd / chartData.length,
      hr: modRatios.hr / chartData.length,
      dt: modRatios.dt / chartData.length,
      chart: chartData
   };
}
