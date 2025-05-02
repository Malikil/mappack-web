"use server";

import db from "@/app/api/db/connection";
import { PolynomialRegressor } from "@rainij/polynomial-regression-js";

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
   const polyReg = new PolynomialRegressor(2);
   polyReg.fit(datasets.x, datasets.y);
   // const results = {
   //    nm: new MLR(datasets.nm.x, datasets.nm.y),
   //    hd: new MLR(datasets.hd.x, datasets.hd.y),
   //    hr: new MLR(datasets.hr.x, datasets.hr.y),
   //    dt: new MLR(datasets.dt.x, datasets.dt.y)
   // };
   return {
      poly: polyReg
   };
}

export async function debug() {
   //const predictor = await getPreviousMapScalings("osu");
   const players = db.collection("players").find();
   for await (const player of players) {
      console.log(player.pvp.vol);
      console.log(player.pve.vol);
   }
}
