"use server";

import { mappacksDb, mapsDb } from "@/app/api/db/connection";
import { addMatchData } from "@/app/api/db/pvp/functions";
import { addMapsToDatabase, createMappool, cyclePools } from "@/helpers/addPool";
import { getCurrentPack } from "@/helpers/currentPack";
import { getOsuToken } from "@/helpers/osuToken";
import { convertPP } from "@/helpers/rankPredictor";
import { delay } from "@/time";
import { DbBeatmap } from "@/types/database.beatmap";
import { DbMappack } from "@/types/database.mappack";
import { PolynomialRegressor } from "@rainij/polynomial-regression-js";
import { Client, GameMode, LegacyClient } from "osu-web.js";

async function getPreviousMapScalings(mode: GameMode) {
   console.log("Get previous map scalings");
   const maplist = mappacksDb.aggregate<Omit<DbMappack, "maps"> & { maps: DbBeatmap[] }>([
      { $match: { mode } },
      {
         $lookup: {
            from: "maps",
            localField: "maps",
            foreignField: "id",
            pipeline: [{ $match: { mode } }],
            as: "maps"
         }
      }
   ]);
   const datasets = { x: [] as number[][], y: [] as number[][] };
   for await (const pool of maplist) {
      pool.maps.forEach(map => {
         const { nm, hd, hr, dt } = map.ratings;
         datasets.x.push([map.stars, map.length, map.bpm, map.ar, map.cs]);
         datasets.y.push([nm.rating, hd.rating, hr.rating, dt.rating]);
      });
   }
   const polyReg = new PolynomialRegressor(2);
   polyReg.fit(datasets.x, datasets.y);
   return polyReg;
}

export async function debug() {
   addMatchData({
      mp: 1,
      winnerId: 3208718,
      loserId: 5322521,
      maps: [
         { map: 4926327, mod: "nm" },
         { map: 5086678, mod: "fm" }
      ],
      winnerScores: [
         [900000, null],
         [600000, "hr"]
      ],
      loserScores: [
         [800000, null],
         [700000, "hd"]
      ]
   });
}
