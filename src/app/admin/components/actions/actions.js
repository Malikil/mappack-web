"use server";

import db from "@/app/api/db/connection";
import regression from "regression";

async function getPreviousMapScalings(mode) {
   console.log("Get previous map scalings");
   const mapsDb = db.collection("maps");
   const maplist = mapsDb.find({ mode });
   const datasets = { nm: [], hd: [], hr: [], dt: [] };
   for await (const pool of maplist) {
      pool.maps.forEach(map => {
         const { nm, hd, hr, dt } = map.ratings;
         datasets.nm.push([map.stars, nm.rating]);
         datasets.hd.push([map.stars, hd.rating]);
         datasets.hr.push([map.stars, hr.rating]);
         datasets.dt.push([map.stars, dt.rating]);
      });
   }
   console.log(datasets.nm);
   console.log(datasets.hd);
   console.log(datasets.hr);
   console.log(datasets.dt);
   const results = {
      nm: regression.polynomial(datasets.nm),
      hd: regression.polynomial(datasets.hd),
      hr: regression.polynomial(datasets.hr),
      dt: regression.polynomial(datasets.dt)
   };
   return results;
}

export async function debug() {
   const results = await getPreviousMapScalings("osu");
   for (const key in results) console.log(results[key].equation);
}
