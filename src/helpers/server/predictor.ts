import { mapsDb } from "@/app/api/db/connection";
import { DbBeatmap } from "@/types/database.beatmap";
//import { Rating } from "@/types/rating";
import { PolynomialRegressor } from "@rainij/polynomial-regression-js";
import { Beatmap, Beatmapset, GameMode } from "osu-web.js";

const INIT_MAP_RD = 150;
const INIT_MAP_VOL = 0.06;
const RATING_MIN = 500;

export function getMaplistForPredictor(mode: GameMode) {
   const adding = ["$ratings.nm.rd", "$ratings.dt.rd"];
   if (mode !== "mania") adding.push("$ratings.hd.rd", "$ratings.hr.rd");
   return mapsDb[mode].aggregate<DbBeatmap>([
      // Discard maps with 0 stars. I expect this will really only happen during SR reworks
      { $match: { stars: { $gt: 0 }, "rating.rd": { $lt: 100 } } },
      { $sort: { "rating.rd": 1 } },
      // {
      //    $addFields: {
      //       rdSum: { $add: adding }
      //    }
      // },
      // Get 100 from each mod
      // {
      //    $facet: {
      //       nmMaps: [
      //          { $match: { "ratings.nm.rd": { $lt: 100 } } },
      //          { $sort: { "ratings.nm.rd": 1 } },
      //          { $limit: 100 }
      //       ],
      //       dtMaps: [
      //          { $match: { "ratings.dt.rd": { $lt: 100 } } },
      //          { $sort: { "ratings.dt.rd": 1 } },
      //          { $limit: 100 }
      //       ],
      //       ...(mode === "mania"
      //          ? {}
      //          : {
      //               hdMaps: [
      //                  { $match: { "ratings.hd.rd": { $lt: 100 } } },
      //                  { $sort: { "ratings.hd.rd": 1 } },
      //                  { $limit: 100 }
      //               ],
      //               hrMaps: [
      //                  { $match: { "ratings.hr.rd": { $lt: 100 } } },
      //                  { $sort: { "ratings.hr.rd": 1 } },
      //                  { $limit: 100 }
      //               ]
      //            }),
      //       combinedMaps: [
      //          { $match: { rdSum: { $lt: mode === "mania" ? 270 : 400 } } },
      //          { $sort: { rdSum: 1 } },
      //          { $limit: 1400 }
      //       ]
      //    }
      // },
      // Combine results
      // {
      //    $project: {
      //       allMaps: {
      //          $concatArrays: [
      //             "$nmMaps",
      //             { $ifNull: ["$hdMaps", []] },
      //             { $ifNull: ["$hrMaps", []] },
      //             "$dtMaps",
      //             "$combinedMaps"
      //          ]
      //       }
      //    }
      // },
      // { $unwind: "$allMaps" },
      // { $replaceRoot: { newRoot: "$allMaps" } },
      // Get unique maps
      // {
      //    $group: {
      //       _id: "$_id",
      //       doc: { $first: "$$ROOT" }
      //    }
      // },
      // { $replaceRoot: { newRoot: "$doc" } },
      { $limit: 1000 }
   ]);
}

function createPredictorInput(
   map: {
      stars: number;
      length: number;
      bpm: number;
      noteCount: {
         circles: number;
         sliders: number;
      };
      maxCombo: number;
      od?: number;
      cs?: number;
      ar?: number;
      convert?: boolean;
   },
   mode: GameMode
) {
   const data = [map.stars, map.length, map.bpm, map.noteCount.circles, map.noteCount.sliders, map.maxCombo];
   if (mode !== "fruits") data.push(map.od);
   if (mode !== "taiko") data.push(map.cs);
   if (mode === "osu") data.push(map.ar);
   else if (mode === "fruits") {
      data.push(map.ar);
      data.push(+map.convert);
   }
   return data;
}

export async function getPreviousMapScalings(mode: GameMode) {
   console.log("Get previous map scalings");
   // const adding = ["$ratings.nm.rd", "$ratings.dt.rd"];
   // if (mode !== "mania") adding.push("$ratings.hd.rd", "$ratings.hr.rd");
   const maplist = getMaplistForPredictor(mode);
   const datasets = { x: [] as number[][], y: [] as number[][] };
   const meta = { max: 1500 };
   for await (const map of maplist) {
      //const { nm, hd, hr, dt } = map.ratings;
      // Update the max and min
      //for (const rating of Object.values<Rating>(map.ratings)) {
      meta.max = Math.max(meta.max, map.rating.rating + map.rating.rd * 2);
      //}
      // const xData = [
      //    map.stars,
      //    map.length,
      //    map.bpm,
      //    map.noteCount.circles,
      //    map.noteCount.sliders,
      //    map.maxCombo
      // ];
      // if (mode !== "fruits") xData.push(map.od);
      // if (mode !== "taiko") xData.push(map.cs);
      // if (mode === "osu") xData.push(map.ar);
      // else if (mode === "fruits") {
      //    xData.push(map.ar);
      //    xData.push(+map.convert);
      // }
      datasets.x.push(createPredictorInput(map, mode));
      const yData = [map.rating.rating, map.mods.DT];
      if (mode !== "mania") yData.push(map.mods.HD, map.mods.HR);
      datasets.y.push(yData);
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
   // const predictData = [
   //    osuBeatmap.difficulty_rating,
   //    osuBeatmap.total_length,
   //    osuBeatmap.bpm,
   //    osuBeatmap.count_circles,
   //    osuBeatmap.count_sliders,
   //    osuBeatmap.max_combo
   // ];
   // if (osuBeatmap.mode !== "fruits") predictData.push(osuBeatmap.accuracy);
   // if (osuBeatmap.mode !== "taiko") predictData.push(osuBeatmap.cs);
   // if (osuBeatmap.mode === "osu") predictData.push(osuBeatmap.ar);
   // else if (osuBeatmap.mode === "fruits") {
   //    predictData.push(osuBeatmap.ar);
   //    predictData.push(+osuBeatmap.convert);
   // }
   const [[ratingRaw, DT, HD, HR]] = predictor.predict([
      createPredictorInput(
         {
            bpm: osuBeatmap.bpm,
            length: osuBeatmap.total_length,
            stars: osuBeatmap.difficulty_rating,
            noteCount: {
               circles: osuBeatmap.count_circles,
               sliders: osuBeatmap.count_sliders
            },
            maxCombo: osuBeatmap.max_combo,
            od: osuBeatmap.accuracy,
            ar: osuBeatmap.ar,
            cs: osuBeatmap.cs,
            convert: osuBeatmap.convert
         },
         osuBeatmap.mode
      )
   ]);
   const rating =
      ratingRaw > max
         ? { rating: max, rd: ratingRaw - max + INIT_MAP_RD, vol: INIT_MAP_VOL }
         : ratingRaw < RATING_MIN
         ? { rating: RATING_MIN, rd: RATING_MIN - ratingRaw + INIT_MAP_RD, vol: INIT_MAP_VOL }
         : { rating: ratingRaw, rd: INIT_MAP_RD, vol: INIT_MAP_VOL };

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
      rating,
      styles: Array.from({ length: parseInt(process.env.SKILL_CATEGORIES) }, () => Math.random() / 100),
      mods: { DT }
   };
   if (osuBeatmap.mode !== "mania") {
      mapData.mods.HD = HD;
      mapData.mods.HR = HR;
   }
   // If the map is unranked, include dates to re-query later
   if (osuBeatmap.ranked < 1) {
      mapData.lastQuery = new Date();
      mapData.lastUpdate = new Date(osuBeatmap.last_updated);
   }
   if (osuBeatmap.mode !== "fruits") mapData.od = osuBeatmap.accuracy;
   if (osuBeatmap.mode !== "taiko") mapData.cs = osuBeatmap.cs;
   if (osuBeatmap.mode === "osu") mapData.ar = osuBeatmap.ar;
   else if (osuBeatmap.mode === "fruits") {
      mapData.ar = osuBeatmap.ar;
      mapData.convert = osuBeatmap.convert;
   }

   return mapData;
}
