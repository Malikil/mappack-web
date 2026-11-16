import { mapsDb } from "@/database/connection";
import { AnyBeatmapType, BeatmapByMode, DbBeatmapBase } from "@/types/database/beatmap";
import { MergeUnion } from "@/types/general";
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

type ModePredictorData = {
   osu: "ar" | "cs" | "od";
   fruits: "ar" | "cs" | "convert";
   taiko: "od";
   mania: "od" | "keys";
};
type SharedPredictorInput = Pick<DbBeatmapBase, "length" | "bpm" | "noteCount" | "maxCombo">;

type PredictorInputByMode = {
   [M in GameMode]: SharedPredictorInput &
      Pick<BeatmapByMode[M], "stars"> &
      Pick<BeatmapByMode[M], Extract<ModePredictorData[M], keyof BeatmapByMode[M]>>;
};
type AnyPredictorInput = PredictorInputByMode[GameMode];
type PredictorInputInclusive = SharedPredictorInput & {
   stars: {
      nm: number;
      dt: number;
      hd?: number;
      hr?: number;
   };
   ar: number;
   cs: number;
   od: number;
   keys: number;
   convert?: boolean;
};

function createPredictorInput<M extends GameMode>(mode: M, map: PredictorInputByMode[NoInfer<M>]): number[] {
   const input: AnyPredictorInput = map;

   const data = [
      input.stars.nm,
      input.stars.dt,
      input.length,
      input.bpm,
      input.noteCount.circles,
      input.noteCount.sliders,
      input.maxCombo
   ];

   switch (mode) {
      case "osu": {
         const osu = input as PredictorInputByMode["osu"];
         data.push(osu.stars.hd, osu.stars.hr, osu.ar, osu.cs, osu.od);
         break;
      }
      case "fruits": {
         const fruits = input as PredictorInputByMode["fruits"];
         data.push(fruits.stars.hr, fruits.ar, fruits.cs, +(fruits.convert ?? false));
         break;
      }
      case "taiko": {
         const taiko = input as PredictorInputByMode["taiko"];
         data.push(taiko.stars.hr, taiko.od);
         break;
      }
      case "mania": {
         const mania = input as PredictorInputByMode["mania"];
         data.push(mania.keys, mania.od);
         break;
      }
   }

   return data;
}

export async function getPreviousMapScalings<M extends GameMode>(mode: M) {
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

type BeatmapPreprationInput<M extends GameMode> = Omit<Beatmap, "mode"> & {
   mode: M;
   max_combo: number;
   beatmapset: Beatmapset;
   moddedStars: Omit<BeatmapByMode[M]["stars"], "nm">;
};
export function prepBeatmapData<M extends GameMode>(
   osuBeatmap: BeatmapPreprationInput<M>,
   predictor: PolynomialRegressor & { meta?: { max: number } }
): BeatmapByMode[M] {
   const { max } = predictor.meta;
   const nSkills = parseInt(process.env.SKILL_CATEGORIES);
   const predictorInputData = {
      bpm: osuBeatmap.bpm,
      length: osuBeatmap.total_length,
      stars: {
         nm: osuBeatmap.difficulty_rating,
         ...osuBeatmap.moddedStars
      } as BeatmapByMode[M]["stars"],
      noteCount: {
         circles: osuBeatmap.count_circles,
         sliders: osuBeatmap.count_sliders
      },
      maxCombo: osuBeatmap.max_combo,
      od: osuBeatmap.accuracy,
      ar: osuBeatmap.ar,
      cs: osuBeatmap.cs,
      keys: osuBeatmap.cs,
      convert: osuBeatmap.convert
   } satisfies PredictorInputInclusive;
   const [[ratingRaw, DT, HD, HR]] = predictor.predict([
      createPredictorInput(osuBeatmap.mode, predictorInputData as PredictorInputByMode[M])
   ]);
   const rating =
      ratingRaw > max
         ? { rating: max, rd: Math.sqrt(ratingRaw - max) + INIT_MAP_RD, vol: INIT_MAP_VOL }
         : ratingRaw < RATING_MIN
           ? { rating: RATING_MIN, rd: Math.sqrt(RATING_MIN - ratingRaw) + INIT_MAP_RD, vol: INIT_MAP_VOL }
           : { rating: ratingRaw, rd: INIT_MAP_RD, vol: INIT_MAP_VOL };

   const mapData: MergeUnion<AnyBeatmapType> = {
      _id: osuBeatmap.id,
      setid: osuBeatmap.beatmapset_id,
      artist: osuBeatmap.beatmapset.artist,
      title: osuBeatmap.beatmapset.title,
      version: osuBeatmap.version,
      mapper: osuBeatmap.beatmapset.creator,
      stars: {
         nm: osuBeatmap.difficulty_rating,
         ...osuBeatmap.moddedStars
      },
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
   if (osuBeatmap.mode === "osu") {
      mapData.ar = osuBeatmap.ar;
      mapData.cs = osuBeatmap.cs;
      mapData.od = osuBeatmap.accuracy;
   } else if (osuBeatmap.mode === "fruits") {
      mapData.ar = osuBeatmap.ar;
      mapData.cs = osuBeatmap.cs;
      mapData.convert = osuBeatmap.convert;
   } else if (osuBeatmap.mode === "taiko") mapData.od = osuBeatmap.accuracy;
   else {
      mapData.od = osuBeatmap.accuracy;
      mapData.keys = osuBeatmap.cs;
   }
   mapData.lastQuery = new Date();

   return mapData as BeatmapByMode[M];
}
