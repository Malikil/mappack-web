import { DbBeatmap, ModRatings } from "@/types/database.beatmap";
import { Rating } from "@/types/rating";
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
   // Scale linearly between min and max scores
   return (score - min) / (max - min);
}

export function scoreFromResult(result: number, gamemode: GameMode, capped: boolean = true) {
   const min: number = MIN_TARGETS[gamemode];
   const max: number = !capped ? 1000000 : MAX_TARGETS[gamemode];
   return Math.max(0, Math.min(result * (max - min) + min, 1000000));
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
