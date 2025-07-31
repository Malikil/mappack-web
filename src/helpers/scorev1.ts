import { DbBeatmap } from "@/types/database.beatmap";
import { LegacyMatchScore, ScoringType } from "osu-web.js";

export class ScoreParser {
   #score: LegacyMatchScore;
   #scoreCache: number;
   #scoreMode: ScoringType;
   #map: DbBeatmap;

   constructor(score: LegacyMatchScore, scoreType: ScoringType) {
      this.#score = score;
      this.#scoreMode = scoreType;
   }

   //setScore(score: LegacyMatchScore, scoreType: ScoringType) { this.#score = score; this.#scoreMode = scoreType }
   setMap(map: DbBeatmap) {
      this.#map = map;
      this.#scoreCache = 0;
   }
   getScore() {
      if (this.#scoreCache) return this.#scoreCache;

      if (this.#scoreMode === "Score V2") return this.#score.score;
      else if (!this.#map) return;

      // Some values depend on the gamemode
      const { accCalc, comboCalc, missComponent } = {
         osu: {
            accCalc: (score: LegacyMatchScore) =>
               300000 *
               Math.pow(
                  (score.count300 + score.count100 / 3 + score.count50 / 6) /
                     (score.count300 + score.count100 + score.count50 + score.countmiss),
                  5
               ),
            comboCalc: (score: LegacyMatchScore, maxCombo: number) => 500000 * (score.maxcombo / maxCombo),
            missComponent: 200000
         },
         fruits: {
            // katu = small droplet miss
            // c50 = small droplet catch
            // All droplets together seem to be worth 200k, independent of combo score
            accCalc: (score: LegacyMatchScore) =>
               (200000 * score.count50) / (score.count50 + score.countkatu),
            comboCalc: (score: LegacyMatchScore, maxCombo: number) => {
               // There's no note acc, every caught note is the same score. Thus no misses means max score
               // Large droplet misses seem to be included in countmiss
               if (score.countmiss < 1) return 800000;
               // From https://gist.github.com/bdach/414d5289f65b0399fa8f9732245a4f7c
               const log4_200 = Math.log(200) / Math.log(4);
               const f = (x: number) => (x < 2 ? 0.5 : x < 200 ? Math.log(x) / Math.log(4) : log4_200);
               const F = (x: number) => {
                  let sum = 0;
                  for (let i = 0; i < x; i++) sum += f(i);
                  return sum;
               };
               const Fmax = F(maxCombo);
               console.log(Fmax);
               const delta = (x: number) =>
                  x > 200 ? delta(200) : (x * (1 + Math.log(200) - Math.log(x))) / Math.log(4);
               console.log(F(score.maxcombo));
               console.log(delta(score.maxcombo));
               // How long are the remaining combos?
               const comboSize = (maxCombo - score.maxcombo) / score.countmiss;
               if (comboSize < 1) return (800000 * (Fmax - F(score.maxcombo))) / Fmax;
               return 800000 * (1 - ((score.countmiss - 1) * delta(comboSize)) / Fmax);
            },
            missComponent: 0
         },
         taiko: {
            accCalc: (score: LegacyMatchScore) =>
               300000 *
               Math.pow(
                  (score.count300 + score.count100 / 3 + score.count50 / 6) /
                     (score.count300 + score.count100 + score.count50 + score.countmiss),
                  5
               ),
            comboCalc: (score: LegacyMatchScore, maxCombo: number) => 500000 * (score.maxcombo / maxCombo),
            missComponent: 200000
         },
         mania: {
            accCalc: (score: LegacyMatchScore) =>
               300000 *
               Math.pow(
                  (score.count300 + score.count100 / 3 + score.count50 / 6) /
                     (score.count300 + score.count100 + score.count50 + score.countmiss),
                  5
               ),
            comboCalc: (score: LegacyMatchScore, maxCombo: number) => 500000 * (score.maxcombo / maxCombo),
            missComponent: 200000
         }
      }[this.#map.mode];

      const accScore = accCalc(this.#score);
      const comboScore = comboCalc(this.#score, this.#map.maxCombo);
      const missScore = missComponent / Math.sqrt(this.#score.countmiss + 1);
      return parseInt((accScore + comboScore + missScore).toFixed());
   }
}
