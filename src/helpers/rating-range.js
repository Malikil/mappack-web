/**
 * @param {...import("@/types/rating").Rating} ratings
 */
export function withinRange(...ratings) {
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
