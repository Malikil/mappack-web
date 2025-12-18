import { logit, sigmoid } from "@/mathplus";
import { DbBeatmap } from "@/types/database.beatmap";
import { Rating } from "@/types/rating";
import { Glicko2 } from "glicko2";
import { GameMode, Mod } from "osu-web.js";

export const MIN_TARGETS = {
   osu: 100000,
   fruits: 500000,
   taiko: 300000,
   mania: 600000
};
export const MAX_TARGETS = {
   osu: 900000,
   fruits: 900000,
   taiko: 900000,
   mania: 950000
};

/**
 * Gives the outcome (0, 1) the player is expected to get on this map. If an array of skills is
 * provided they are also used in the prediction. Both skills arrays should be equal length.
 * @param playerRating
 * @param mapRating
 * @param playerSkills
 * @param mapSkills
 * @returns
 */
export function predictOutcome(
   playerRating: Rating,
   mapRating: Rating,
   playerSkills: number[] = [],
   mapSkills: number[] = []
) {
   const calculator = new Glicko2();
   const playerCalc = calculator.makePlayer(playerRating.rating, playerRating.rd, playerRating.vol);
   const mapCalc = calculator.makePlayer(mapRating.rating, mapRating.rd, mapRating.vol);
   const simplePredict = calculator.predict(playerCalc, mapCalc);
   let residual = 0;
   for (let i = 0; i < playerSkills.length; i++) residual += playerSkills[i] * mapSkills[i];

   return sigmoid(logit(simplePredict) + residual);
}

/**
 * Returns the match result to use, assuming player first then map second
 */
export function matchResultValue(
   score: number,
   gamemode: GameMode,
   mods: {
      mods: Mod[];
      player: Partial<Record<Mod, number>>;
      map: Partial<Record<Mod, number>>;
   } = null
) {
   if (mods) {
      const playerMult = mods.mods.reduce((mult, mod) => mult * (mods.player[mod] || 1), 1);
      const mapMult = mods.mods.reduce((mult, mod) => mult * (mods.map[mod] || 1), 1);
      score *= playerMult * mapMult;
   }
   const min: number = MIN_TARGETS[gamemode];
   const max: number = MAX_TARGETS[gamemode];

   if (score < min) return 0;
   if (score > max) return 1;

   const mid = (min + max) / 2;
   const width = max - min;
   const k = 4 / width;

   const fMin = sigmoid((-k * width) / 2);
   const fMax = sigmoid((k * width) / 2);
   const raw = sigmoid(k * (score - mid));

   return (raw - fMin) / (fMax - fMin);
}

/**
 * @param result Value (0, 1) the player is expected to get
 * @param gamemode
 * @returns
 */
export function scoreFromResult(
   result: number,
   gamemode: GameMode,
   mods: {
      mods: Mod[];
      player: Partial<Record<Mod, number>>;
      map: Partial<Record<Mod, number>>;
   } = null
) {
   if (result <= 0) return 0;
   if (result >= 1) return 1000000;
   const min = MIN_TARGETS[gamemode];
   const max = MAX_TARGETS[gamemode];
   const mid = (min + max) / 2;
   const width = max - min;
   const k = 4 / width;
   // Avoid infinites
   const eps = 1e-9;
   const r = Math.min(1 - eps, Math.max(eps, result));
   const predictScore = mid + logit(r) / k;
   let modMult = 1;
   if (mods) {
      const playerMult = mods.mods.reduce((mult, mod) => mult * (mods.player[mod] || 1), 1);
      const mapMult = mods.mods.reduce((mult, mod) => mult * (mods.map[mod] || 1), 1);
      modMult = mapMult * playerMult;
   }

   return Math.max(0, Math.min(predictScore / modMult, 1000000));
}

export function withinRange(...ratings: { rating: number; rd: number }[]) {
   ratings = ratings.filter(r => r);
   if (ratings.length < 2) return false;
   const range = Math.sqrt(ratings.reduce((sum, r) => sum + r.rd * r.rd, 0));
   const { min, max } = ratings.reduce(
      (agg, r) => {
         if (r.rating < agg.min.rating) agg.min = r;
         else if (r.rating > agg.max.rating) agg.max = r;
         return agg;
      },
      { min: ratings[0], max: ratings[0] }
   );
   const diff = Math.abs(min.rating - max.rating);
   return diff <= range;
}

export function anyWithinRange(map: DbBeatmap, candidateRating: Rating) {
   if (withinRange(map.rating, candidateRating)) return true;
   const searchMods = ["HD", "HR", "DT"] as Mod[];
   return searchMods.some(mod =>
      withinRange({ ...map.rating, rating: map.rating.rating * (map.mods[mod] || 1) }, candidateRating)
   );
}

export function combineRatings(...ratings: Rating[]) {
   const agg = ratings
      .filter(v => v)
      .reduce(
         (agg, r) => ({
            rating: agg.rating + r.rating,
            rd: agg.rd + r.rd * r.rd
         }),
         { rating: 0, rd: 0 }
      );
   return {
      rating: agg.rating / ratings.length,
      rd: Math.sqrt(agg.rd)
   };
}
