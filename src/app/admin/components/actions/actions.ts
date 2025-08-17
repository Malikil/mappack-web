"use server";

import util from "util";
import db, { historyDb, maniaDb, mapsDb, playersDb, taikoDb } from "@/app/api/db/connection";
import { batchArray, batchCursor } from "@/helpers/list-splitter";
import { getOsuToken } from "@/helpers/osuToken";
import { DbHistory } from "@/types/database.history";
import { UndocumentedBeatmappack, UndocumentedBeatmappackCompact } from "@/types/undocumented.beatmappacks";
import { PolynomialRegressor } from "@rainij/polynomial-regression-js";
import { Beatmap, Beatmapset, Client, GameMode } from "osu-web.js";
import { DbBeatmap } from "@/types/database.beatmap";
import { ModRatings, Rating, SimpleMod } from "@/types/rating";
import { matchResultValue, parseMpLobby } from "@/app/profile/[playerid]/pve/functions";
import { getMaplist } from "@/helpers/currentPack";
import { delay, seconds } from "@/time";
import { DbPlayer, ModeInfo, PvEMatchHistory } from "@/types/database.player";
import { Glicko2, Player } from "glicko2";
import { UpdateFilter } from "mongodb";
import { revalidatePath } from "next/cache";
import { UndocumentedBeatmapsetResponse } from "@/types/undocumented.beatmapset";

async function getPreviousMapScalings(mode: GameMode) {
   console.log("Get previous map scalings");
   const adding = ["$ratings.nm.rd", "$ratings.dt.rd"];
   if (mode !== "mania") adding.push("$ratings.hd.rd", "$ratings.hr.rd");
   const maplist = mapsDb[mode].aggregate<DbBeatmap & { rdSum: number }>([
      {
         $addFields: {
            rdSum: { $add: adding }
         }
      },
      { $match: { rdSum: { $lt: mode === "mania" ? 300 : 400 } } },
      { $sort: { rdSum: 1 } },
      { $limit: 1000 }
   ]);
   const datasets = { x: [] as number[][], y: [] as number[][] };
   const meta = { max: 1500 };
   for await (const map of maplist) {
      const { nm, hd, hr, dt } = map.ratings;
      // Update the max and min
      for (const rating of Object.values<Rating>(map.ratings)) {
         meta.max = Math.max(meta.max, rating.rating + rating.rd * 2);
      }
      const xData = [
         map.stars,
         map.length,
         map.bpm,
         map.cs,
         map.od,
         map.noteCount.circles,
         map.noteCount.sliders,
         map.maxCombo
      ];
      if (mode !== "mania") xData.push(map.ar);
      if (mode === "fruits") xData.push(+map.convert);
      datasets.x.push(xData);
      datasets.y.push([nm.rating, hd?.rating || 0, hr?.rating || 0, dt.rating]);
   }
   const polyReg: PolynomialRegressor & { meta?: { max: number } } = new PolynomialRegressor(1);
   polyReg.fit(datasets.x, datasets.y);
   polyReg.meta = meta;
   return polyReg;
}

const INIT_MAP_RD = 150;
const INIT_MAP_VOL = 0.06;
const RATING_MIN = 500;

function prepBeatmapData(
   osuBeatmap: Beatmap & {
      max_combo: number;
      beatmapset: Beatmapset;
   },
   predictor: PolynomialRegressor & { meta?: { max: number } }
): DbBeatmap {
   const { max } = predictor.meta;
   const predictData = [
      osuBeatmap.difficulty_rating,
      osuBeatmap.total_length,
      osuBeatmap.bpm,
      osuBeatmap.cs,
      osuBeatmap.accuracy,
      osuBeatmap.count_circles,
      osuBeatmap.count_sliders,
      osuBeatmap.max_combo
   ];
   if (osuBeatmap.mode !== "mania") predictData.push(osuBeatmap.ar);
   if (osuBeatmap.mode === "fruits") predictData.push(+osuBeatmap.convert);
   const [[nm, hd, hr, dt]] = predictor.predict([predictData]);
   const ratingObj = (rating: number) => {
      if (rating > max) return { rating: max, rd: rating - max + INIT_MAP_RD, vol: INIT_MAP_VOL };
      else if (rating < RATING_MIN)
         return { rating: RATING_MIN, rd: RATING_MIN - rating + INIT_MAP_RD, vol: INIT_MAP_VOL };
      else return { rating, rd: INIT_MAP_RD, vol: INIT_MAP_VOL };
   };
   const mapData: DbBeatmap = {
      _id: osuBeatmap.id,
      setid: osuBeatmap.beatmapset_id,
      artist: osuBeatmap.beatmapset.artist,
      title: osuBeatmap.beatmapset.title,
      version: osuBeatmap.version,
      mapper: osuBeatmap.beatmapset.creator,
      stars: osuBeatmap.difficulty_rating,
      length: osuBeatmap.total_length,
      bpm: osuBeatmap.bpm,
      cs: osuBeatmap.cs,
      od: osuBeatmap.accuracy,
      maxCombo: osuBeatmap.max_combo,
      noteCount: {
         circles: osuBeatmap.count_circles,
         sliders: osuBeatmap.count_sliders
      },
      ratings: {
         nm: ratingObj(nm),
         dt: ratingObj(dt)
      }
   };
   // If the map is unranked, include dates to re-query later
   if (osuBeatmap.ranked < 1) {
      mapData.lastQuery = new Date();
      mapData.lastUpdate = new Date(osuBeatmap.last_updated);
   }
   if (osuBeatmap.mode !== "mania") {
      mapData.ratings.hd = ratingObj(hd);
      mapData.ratings.hr = ratingObj(hr);
      mapData.ar = osuBeatmap.ar;
   }
   if (osuBeatmap.mode === "fruits") mapData.convert = osuBeatmap.convert;

   return mapData;
}

export async function debug() {
   const result = await maniaDb.updateMany({}, [
      {
         $set: {
            "ratings.dt.rating": {
               $min: [
                  { $max: ["$ratings.nm.rating", "$ratings.dt.rating"] },
                  { $add: ["$ratings.nm.rd", "$ratings.nm.rating"] }
               ]
            }
         }
      }
   ]);
   console.log(result);
}
