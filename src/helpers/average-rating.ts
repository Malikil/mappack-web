import { ModRatings } from "@/types/rating";

export default function averageRating(map: { ratings: ModRatings }) {
   const keys = Object.keys(map.ratings);
   const sum = keys.reduce((sum, mod) => sum + map.ratings[mod].rating, 0);
   return sum / keys.length;
}
