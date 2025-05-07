// How much PP does the rank 10k player have?
const PP_EQUIVALENT = 9017;

export function convertPP(pp) {
   // Below 1000 PP, rating == pp
   if (pp < 1000) return pp;
   // Between 1000 and 10k rank (pp value), linearly scale so 10k == 2000 rating
   else if (pp < PP_EQUIVALENT) return 1000 * ((pp - 1000) / (PP_EQUIVALENT - 1000) + 1);
   // Afterwards logarithmically scale up from 2000 rating
   else return 1000 * (Math.log(pp / 1000) / Math.log(PP_EQUIVALENT / 1000) + 1);
}

/**
 * @param {...import("@/types/rating").Rating} ratings
 */
export function withinRange(...ratings) {
   ratings = ratings.filter(r => r);
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

/**
 *
 * @param {import("@/types/rating").ModRatings} mapRatings
 * @param {import("@/types/rating").Rating} candidateRating
 */
export function anyWithinRange(mapRatings, candidateRating) {
   return Object.keys(mapRatings).some(key => withinRange(mapRatings[key], candidateRating));
}

/**
 * @param {...import("@/types/rating").Rating} ratings
 */
export function combineRatings(...ratings) {
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
