"use client";

import { Glicko2 } from "glicko2";
import { toast } from "react-toastify";

/**
 * @param {import("@/types/database.beatmap").DbBeatmap} beatmap
 * @param {'nm'|'hd'|'hr'|'dt'|'fm'} mod
 */
export function predictScore(beatmap, mod, rating) {
   const calculator = new Glicko2();
   const target = calculator.makePlayer(rating.rating, rating.rd);
   console.log(rating);
   const mapRating = beatmap.ratings[mod] || {
      rating: (beatmap.ratings.hd.rating + beatmap.ratings.hr.rating) / 2,
      rd: Math.sqrt(
         beatmap.ratings.hd.rd * beatmap.ratings.hd.rd +
            beatmap.ratings.hr.rd * beatmap.ratings.hr.rd
      )
   };
   console.log(mapRating);
   const mapPlayer = calculator.makePlayer(mapRating.rating, mapRating.rd);
   const winrate = target.predict(mapPlayer);
   const expectedScore = (winrate - 0.5) * 600000 + 600000;
   console.log(winrate, expectedScore);
   // Randomize a bit
   const modScore = mod === "nm" ? 600000 : mod === "hd" ? 500000 : 650000;
   const randomizedScore = (Math.random() * 1000000 + expectedScore * 2 + modScore) / 4;
   toast(`Score: ${randomizedScore.toFixed()}`, { autoClose: 4000 });
}
