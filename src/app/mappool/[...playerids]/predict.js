"use client";

import { Glicko2 } from "glicko2";
import { toast } from "react-toastify";

function gaussianRandom() {
   const phi = 2 * Math.PI * Math.random();
   // Converting [0,1) to (0,1]
   const r = Math.sqrt(-2 * Math.log(1 - Math.random()));
   const x = r * Math.cos(phi);
   const y = r * Math.sin(phi);
   // Transform to the desired mean and standard deviation:
   return [x, y];
}

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
   const modAdj = mod === "nm" ? 0 : mod === "hd" ? -75000 : 60000;
   // Randomize a bit
   const rand = gaussianRandom();
   const randomizedScore = rand[0] * 100000 + expectedScore + modAdj;
   // Clamp
   const minScore = Math.max(0, Math.min(100000, rand[1] * 10000 + 50000));
   const scoreResult = Math.max(minScore, Math.min(1000000, randomizedScore));
   toast(`Score: ${scoreResult.toFixed()}`, { autoClose: 4000 });
}
