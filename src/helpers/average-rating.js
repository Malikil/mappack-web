/**
 * @param {import("@/types/database.beatmap").DbBeatmap} map
 */
export default function averageRating(map) {
   const keys = Object.keys(map.ratings);
   const sum = keys.reduce((sum, mod) => sum + map.ratings[mod].rating, 0);
   return sum / keys.length;
}
