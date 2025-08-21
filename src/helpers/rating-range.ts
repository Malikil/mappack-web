import { ModRatings, Rating } from "@/types/rating";
import { GameMode } from "osu-web.js";

/**
 * Returns the match result to use, assuming player first then map second
 */
export function matchResultValue(score: number, gamemode: GameMode) {
   const min: number = {
      osu: 100000,
      fruits: 500000,
      taiko: 300000,
      mania: 475000
   }[gamemode];
   const max: number = gamemode === "mania" ? 925000 : 900000;
   if (score < min) return 0;
   if (score > max) return 1;
   // Scale linearly between min and max scores
   return (score - min) / (max - min);
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

export function anyWithinRange(mapRatings: ModRatings, candidateRating: Rating) {
   return Object.keys(mapRatings).some(key => withinRange(mapRatings[key], candidateRating));
}

export function combineRatings(...ratings: Rating[]) {
   const agg = ratings.reduce(
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
