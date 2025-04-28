"use server";

import db from "@/app/api/db/connection";
import MLR from "ml-regression-multivariate-linear";
// note https://www.npmjs.com/package/@rainij/polynomial-regression-js

async function getPreviousMapScalings(mode) {
   console.log("Get previous map scalings");
   const mapsDb = db.collection("maps");
   const maplist = mapsDb.find({ mode });
   const datasets = { x: [], y: [] };
   for await (const pool of maplist) {
      pool.maps.forEach(map => {
         const { nm, hd, hr, dt } = map.ratings;
         datasets.x.push([map.stars, map.length, map.bpm, map.ar, map.cs]);
         datasets.y.push([nm.rating, hd.rating, hr.rating, dt.rating]);
         //console.log([map.stars, nm.rating, hd.rating, hr.rating, dt.rating].join(", "));
      });
   }
   // const results = {
   //    nm: new MLR(datasets.nm.x, datasets.nm.y),
   //    hd: new MLR(datasets.hd.x, datasets.hd.y),
   //    hr: new MLR(datasets.hr.x, datasets.hr.y),
   //    dt: new MLR(datasets.dt.x, datasets.dt.y)
   // };
   return new MLR(datasets.x, datasets.y);
}

export async function debug() {
   //const oldRatings = await getPreviousMapScalings("osu");
   const test = await db.collection("maps").findOne({ mode: "osu", active: "fresh" });
   test.maps.forEach(map =>
      console.log(
         [
            map.stars,
            map.ratings.nm.rating,
            map.ratings.hd.rating,
            map.ratings.hr.rating,
            map.ratings.dt.rating
         ].join(", ")
      )
   );
}
