import { mapsDb } from "@/database/connection";
import { AnyBeatmapType, BeatmapByMode } from "@/types/database/beatmap";
import { PolynomialRegressor } from "@rainij/polynomial-regression-js";
import { Beatmap, Beatmapset, GameMode } from "osu-web.js";

const INIT_MAP_RD = 150;
const INIT_MAP_VOL = 0.06;
const RATING_MIN = 500;

export function getMaplistForPredictor<M extends GameMode>(mode: M) {
   const adding = ["$ratings.nm.rd", "$ratings.dt.rd"];
   if (mode !== "mania") adding.push("$ratings.hd.rd", "$ratings.hr.rd");
   return mapsDb[mode].aggregate<BeatmapByMode[M]>([
      // Discard maps with 0 stars. I expect this will really only happen during SR reworks
      { $match: { "stars.nm": { $gt: 0 }, "rating.rd": { $lt: 100 }, dtb: { $ne: true } } },
      { $sort: { "rating.rd": 1 } },
      { $limit: 1000 }
   ]);
}

type SharedPredictorData = {
   length: number;
   bpm: number;
   noteCount: {
      circles: number;
      sliders: number;
   };
   maxCombo: number;
};
function createPredictorInput(
   mode: "osu",
   map: SharedPredictorData & {
      stars: {
         nm: number;
         hr: number;
         dt: number;
      };
      ar: number;
      cs: number;
      od: number;
   }
): number[];
function createPredictorInput(
   mode: "fruits",
   map: SharedPredictorData & {
      stars: {
         nm: number;
         hr: number;
         dt: number;
      };
      ar: number;
      cs: number;
      convert?: boolean;
   }
): number[];
function createPredictorInput(
   mode: "taiko",
   map: SharedPredictorData & {
      stars: {
         nm: number;
         hr: number;
         dt: number;
      };
      od: number;
   }
): number[];
function createPredictorInput(
   mode: "mania",
   map: SharedPredictorData & {
      stars: {
         nm: number;
         dt: number;
      };
      od: number;
      cs: number;
   }
): number[];
function createPredictorInput(
   mode: GameMode,
   map: SharedPredictorData & {
      stars: {
         nm: number;
         dt: number;
         hr?: number;
      };
      ar?: number;
      cs?: number;
      od?: number;
      convert?: boolean;
   }
): number[] {
   const data = [
      map.stars.nm,
      map.stars.dt,
      map.length,
      map.bpm,
      map.noteCount.circles,
      map.noteCount.sliders,
      map.maxCombo
   ];
   switch (mode) {
      case "osu":
         data.push(map.stars.hr, map.ar, map.cs, map.od);
         break;
      case "fruits":
         data.push(map.stars.hr, map.ar, map.cs, +(map.convert || 0));
         break;
      case "taiko":
         data.push(map.stars.hr, map.od);
         break;
      case "mania":
         data.push(map.cs, map.od);
         break;
   }
   return data;
}

export async function getPreviousMapScalings(mode: GameMode) {
   console.log("Get previous map scalings");
   const maplist = getMaplistForPredictor(mode);
   const datasets = { x: [] as number[][], y: [] as number[][] };
   const meta = { max: 1500 };
   for await (const map of maplist) {
      meta.max = Math.max(meta.max, map.rating.rating + map.rating.rd * 2);
      datasets.x.push(createPredictorInput(mode, map));
      const yData = [map.rating.rating, map.mods.DT || 1];
      if (mode !== "mania") yData.push(map.mods.HD || 1, map.mods.HR || 1);
      datasets.y.push(yData);
   }
   const polyReg: PolynomialRegressor & { meta?: { max: number } } = new PolynomialRegressor(2, false, true);
   polyReg.fit(datasets.x, datasets.y);
   polyReg.meta = meta;
   return polyReg;
}

export function prepBeatmapData<M extends GameMode>(
   osuBeatmap: Beatmap & {
      max_combo: number;
      beatmapset: Beatmapset;
   },
   predictor: PolynomialRegressor & { meta?: { max: number } }
): BeatmapByMode[M] {
   const { max } = predictor.meta;
   const nSkills = parseInt(process.env.SKILL_CATEGORIES);
   const [[ratingRaw, DT, HD, HR]] = predictor.predict([
      createPredictorInput(osuBeatmap.mode, {
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
      })
   ]);
   const rating =
      ratingRaw > max
         ? { rating: max, rd: Math.sqrt(ratingRaw - max) + INIT_MAP_RD, vol: INIT_MAP_VOL }
         : ratingRaw < RATING_MIN
           ? { rating: RATING_MIN, rd: Math.sqrt(RATING_MIN - ratingRaw) + INIT_MAP_RD, vol: INIT_MAP_VOL }
           : { rating: ratingRaw, rd: INIT_MAP_RD, vol: INIT_MAP_VOL };

   const mapData: AnyBeatmapType = {
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
      styles: Array.from({ length: nSkills }, () => ((Math.random() - 0.5) * Math.sqrt(nSkills)) / 100),
      mods: { DT }
   };
   if (osuBeatmap.mode !== "mania") {
      mapData.mods.HD = HD;
      mapData.mods.HR = HR;
   }
   // If the map is unranked, include dates to re-query later
   if (osuBeatmap.ranked < 1) mapData.lastQuery = new Date();
   if (osuBeatmap.mode !== "fruits") mapData.od = osuBeatmap.accuracy;
   if (osuBeatmap.mode !== "taiko") mapData.cs = osuBeatmap.cs;
   if (osuBeatmap.mode === "osu") mapData.ar = osuBeatmap.ar;
   else if (osuBeatmap.mode === "fruits") {
      mapData.ar = osuBeatmap.ar;
      mapData.convert = osuBeatmap.convert;
   }

   return mapData;
}
