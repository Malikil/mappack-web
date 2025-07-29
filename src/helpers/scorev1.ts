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

      // 30% acc
      const accComponent =
         300000 *
         Math.pow(
            (this.#score.count300 + this.#score.count100 / 3 + this.#score.count50 / 6) /
               (this.#score.count300 + this.#score.count100 + this.#score.count50 + this.#score.countmiss),
            5
         );
      // 50% max combo
      const comboComponent = 500000 * (this.#score.maxcombo / this.#map.maxCombo);
      // 20% miss count
      const missComponent = 200000 / Math.sqrt(this.#score.countmiss + 1);
      return accComponent + comboComponent + missComponent;
   }
}
