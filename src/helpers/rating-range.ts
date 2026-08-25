import { logit, sigmoid } from "@/mathplus";
import { Rating } from "@/types/rating";
import { Glicko2 } from "glicko2";
import { GameMode, Mod } from "osu-web.js";

const SIGMOID_WIDTH = 6;
export const MIN_ABSOLUTE = {
   osu: 92099,
   fruits: 459734,
   taiko: 323917,
   mania: 624274,
   dtb: 5125
};
export const MIN_TARGETS = {
   osu: 105432,
   fruits: 497147,
   taiko: 357592,
   mania: 660635,
   dtb: 4909
};
export const MAX_TARGETS = {
   osu: 892519,
   fruits: 906029,
   taiko: 920871,
   mania: 963562,
   dtb: 67
};
export const MAX_ABSOLUTE = {
   osu: 906084,
   fruits: 918046,
   taiko: 931134,
   mania: 973018,
   dtb: 0
};
export const UPDATE_REFERENCE = {
   osu: "OWC'25",
   fruits: "CWC'26",
   taiko: "TWC'26",
   mania: "MWC4K'26",
   dtb: "Oriio Cup 2026"
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
   gamemode: GameMode | "dtb",
   mods: {
      mods: Mod[];
      player: Partial<Record<Mod, number>>;
      map: Partial<Record<Mod, number>>;
   } = null
) {
   //console.log(`Convert ${score.toFixed()} to result`);
   if (mods) {
      const playerMult = mods.mods.reduce((mult, mod) => mult * (mods.player[mod] || 1), 1);
      const mapMult = mods.mods.reduce((mult, mod) => mult * (mods.map[mod] || 1), 1);
      score *= playerMult * mapMult;
      //console.log(`Mods: x${(playerMult * mapMult).toFixed(2)} = ${score}`);
   }
   const min: number = MIN_TARGETS[gamemode];
   const max: number = MAX_TARGETS[gamemode];
   const absMin = MIN_ABSOLUTE[gamemode];
   const absMax = MAX_ABSOLUTE[gamemode];

   //console.log(`Clamp to [${absMin}, ${absMax}]`);
   if (gamemode === "dtb") {
      if (score < absMax) return 1;
      if (score > absMin) return 0;
   } else {
      if (score < absMin) return 0;
      if (score > absMax) return 1;
   }

   const mid = (min + max) / 2;
   const width = max - min;
   const k = SIGMOID_WIDTH / width;
   //console.log(`k: ${k}`);
   const raw = sigmoid(k * (score - mid));
   //console.log(`Raw sigmoid score: ${raw}`);

   const fMin = sigmoid(k * (absMin - mid));
   const fMax = sigmoid(k * (absMax - mid));

   return (raw - fMin) / (fMax - fMin);
}

/**
 * @param result Value (0, 1) the player is expected to get
 * @returns
 */
export function scoreFromResult(
   result: number,
   gamemode: GameMode | "dtb",
   mods: {
      mods: Mod[];
      player: Partial<Record<Mod, number>>;
      map: Partial<Record<Mod, number>>;
   } = null
) {
   if (gamemode === "dtb") {
      if (result <= 0) return MIN_ABSOLUTE.dtb;
      if (result >= 1) return 0;
   } else {
      if (result <= 0) return 0;
      if (result >= 1) return 1000000;
   }
   const min = MIN_TARGETS[gamemode];
   const max = MAX_TARGETS[gamemode];
   const mid = (min + max) / 2;
   const width = max - min;
   const k = SIGMOID_WIDTH / width;
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

export function effectiveRating(baseRating: Rating, mode: GameMode | "dtb", modMult: number) {
   console.log(`Rating: ${baseRating.rating.toFixed()} Multiplier: ${modMult.toFixed(2)}`);
   const baseOutcome = 0.5;
   const baseScore = scoreFromResult(baseOutcome, mode);
   const targetScore = baseScore / modMult;
   console.log(`Score: ${baseScore.toFixed()} / ${modMult.toFixed(2)} = ${targetScore.toFixed()}`);
   const targetOutcome = matchResultValue(targetScore, mode);
   console.log(`Target outcome: ${targetOutcome.toFixed(4)}`);

   let [lo, hi] = [baseRating.rating, baseRating.rating * modMult * modMult].sort((a, b) => a - b);
   console.log(`Search ratings within ${lo.toFixed()} to ${hi.toFixed()}`);
   let outcome = 0.5;
   for (let i = 0; i < 25; i++) {
      const mid = (lo + hi) / 2;
      outcome = predictOutcome(baseRating, { ...baseRating, rating: mid });
      if (outcome > targetOutcome) lo = mid;
      else hi = mid;
   }
   console.log(`Found rating ${((lo + hi) / 2).toFixed()} with outcome ${outcome.toFixed(4)}`);

   return (lo + hi) / 2;
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

export function prettyRating(rating: number) {
   const cutoff = 452; // From minimum rating -1269 | Retrieved Feb 8, 2026
   if (rating >= cutoff) return rating.toFixed();
   else return (cutoff * Math.exp(rating / cutoff - 1)).toFixed();
}
