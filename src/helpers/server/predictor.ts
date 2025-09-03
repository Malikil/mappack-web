import { mapsDb } from "@/app/api/db/connection";
import { DbBeatmap } from "@/types/database.beatmap";
import { Rating } from "@/types/rating";
import { PolynomialRegressor } from "@rainij/polynomial-regression-js";
import { Glicko2 } from "glicko2";
import { Beatmap, Beatmapset, GameMode } from "osu-web.js";

const INIT_MAP_RD = 150;
const INIT_MAP_VOL = 0.06;
const RATING_MIN = 500;

export function getMaplistForPredictor(mode: GameMode) {
   const adding = ["$ratings.nm.rd", "$ratings.dt.rd"];
   if (mode !== "mania") adding.push("$ratings.hd.rd", "$ratings.hr.rd");
   return mapsDb[mode].aggregate<DbBeatmap & { rdSum: number }>([
      {
         $addFields: {
            rdSum: { $add: adding }
         }
      },
      // Get 100 from each mod
      {
         $facet: {
            nmMaps: [
               { $match: { "ratings.nm.rd": { $lt: 100 } } },
               { $sort: { "ratings.nm.rd": 1 } },
               { $limit: 100 }
            ],
            dtMaps: [
               { $match: { "ratings.dt.rd": { $lt: 100 } } },
               { $sort: { "ratings.dt.rd": 1 } },
               { $limit: 100 }
            ],
            hdMaps:
               mode === "mania"
                  ? []
                  : [
                       { $match: { "ratings.hd.rd": { $lt: 100 } } },
                       { $sort: { "ratings.hd.rd": 1 } },
                       { $limit: 100 }
                    ],
            hrMaps:
               mode === "mania"
                  ? []
                  : [
                       { $match: { "ratings.hr.rd": { $lt: 100 } } },
                       { $sort: { "ratings.hr.rd": 1 } },
                       { $limit: 100 }
                    ],
            combinedMaps: [
               { $match: { rdSum: { $lt: mode === "mania" ? 200 : 400 } } },
               { $sort: { rdSum: 1 } },
               { $limit: 1400 }
            ]
         }
      },
      // Combine results
      {
         $project: {
            allMaps: {
               $concatArrays: ["$nmMaps", "$hdMaps", "$hrMaps", "$dtMaps", "$combinedMaps"]
            }
         }
      },
      { $unwind: "$allMaps" },
      { $replaceRoot: { newRoot: "$allMaps" } },
      // Get unique maps
      {
         $group: {
            _id: "$_id",
            doc: { $first: "$$ROOT" }
         }
      },
      { $replaceRoot: { newRoot: "$doc" } },
      { $limit: 1000 }
   ]);
}

export async function getPreviousMapScalings(mode: GameMode) {
   console.log("Get previous map scalings");
   const adding = ["$ratings.nm.rd", "$ratings.dt.rd"];
   if (mode !== "mania") adding.push("$ratings.hd.rd", "$ratings.hr.rd");
   const maplist = getMaplistForPredictor(mode);
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
         map.noteCount.circles,
         map.noteCount.sliders,
         map.maxCombo
      ];
      if (mode !== "fruits") xData.push(map.od);
      if (mode !== "taiko") xData.push(map.cs);
      if (mode === "osu") xData.push(map.ar);
      else if (mode === "fruits") {
         xData.push(map.ar);
         xData.push(+map.convert);
      }
      datasets.x.push(xData);
      datasets.y.push([nm.rating, hd?.rating || 0, hr?.rating || 0, dt.rating]);
   }
   const polyReg: PolynomialRegressor & { meta?: { max: number } } = new PolynomialRegressor(2, false, true);
   polyReg.fit(datasets.x, datasets.y);
   polyReg.meta = meta;
   return polyReg;
}

export function prepBeatmapData(
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
      osuBeatmap.count_circles,
      osuBeatmap.count_sliders,
      osuBeatmap.max_combo
   ];
   if (osuBeatmap.mode !== "fruits") predictData.push(osuBeatmap.accuracy);
   if (osuBeatmap.mode !== "taiko") predictData.push(osuBeatmap.cs);
   if (osuBeatmap.mode === "osu") predictData.push(osuBeatmap.ar);
   else if (osuBeatmap.mode === "fruits") {
      predictData.push(osuBeatmap.ar);
      predictData.push(+osuBeatmap.convert);
   }
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
      maxCombo: osuBeatmap.max_combo,
      noteCount: {
         circles: osuBeatmap.count_circles,
         sliders: osuBeatmap.count_sliders
      },
      ratings: {
         nm: ratingObj(nm),
         dt: ratingObj(dt)
      },
      styles: Array.from({ length: parseInt(process.env.SKILL_CATEGORIES) }, () => Math.random() / 100)
   };
   // If the map is unranked, include dates to re-query later
   if (osuBeatmap.ranked < 1) {
      mapData.lastQuery = new Date();
      mapData.lastUpdate = new Date(osuBeatmap.last_updated);
   }
   if (osuBeatmap.mode !== "fruits") mapData.od = osuBeatmap.accuracy;
   if (osuBeatmap.mode !== "taiko") mapData.cs = osuBeatmap.cs;
   if (osuBeatmap.mode !== "mania") {
      mapData.ratings.hd = ratingObj(hd);
      mapData.ratings.hr = ratingObj(hr);
   }
   if (osuBeatmap.mode === "osu") mapData.ar = osuBeatmap.ar;
   else if (osuBeatmap.mode === "fruits") {
      mapData.ar = osuBeatmap.ar;
      mapData.convert = osuBeatmap.convert;
   }

   return mapData;
}

//#region Predicting actual map score
export function predictOutcome(playerRating: Rating, mapRating: Rating, playerSkills: number[], mapSkills: number[]) {
   const calculator = new Glicko2();
   const playerCalc = calculator.makePlayer(playerRating.rating, playerRating.rd, playerRating.vol);
   const mapCalc = calculator.makePlayer(mapRating.rating, mapRating.rd, mapRating.vol);
   const simplePredict = calculator.predict(playerCalc, mapCalc);
   let residual = 0;
   for (let i = 0; i < playerSkills.length; i++)
      residual += playerSkills[i] * mapSkills[i];
   return simplePredict + residual;
}
//#endregion