import { DbBeatmap } from "@/types/database.beatmap";
import { GameMode, LegacyMatchScore, Mod, ScoringType } from "osu-web.js";

const difficultyMods = {
   osu: {},
   fruits: {
      EZ: 0.5,
      HT: 0.3
   },
   taiko: {},
   mania: {}
};

export class ScoreParser {
   static parseV1Score(score: LegacyMatchScore, mode: GameMode, map: DbBeatmap) {
      const parser = new ScoreParser(score, "Score", mode);
      parser.setMap(map);
      return parser.getScore();
   }

   #score: LegacyMatchScore;
   #scoreCache: number;
   #scoreMode: ScoringType;
   #map: DbBeatmap;
   #mode: GameMode;
   #modMult: number;

   constructor(score: LegacyMatchScore, scoreType: ScoringType, mode: GameMode, mods: Mod[] = []) {
      this.#score = score;
      this.#scoreMode = scoreType;
      this.#mode = mode;
      this.#modMult = mods?.reduce((mult, mod) => mult * (difficultyMods[mode][mod] || 1), 1) || 1;
   }

   setMap(map: DbBeatmap) {
      this.#map = map;
      this.#scoreCache = 0;
   }
   getScore() {
      if (this.#scoreCache) return this.#scoreCache;

      if (this.#scoreMode === "Score V2") return this.#score.score / this.#modMult;
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
            accCalc: (score: LegacyMatchScore) => {
               const s = (200000 * score.count50) / (score.count50 + score.countkatu);
               if (isNaN(s)) return 200000;
               else return s;
            },
            comboCalc: (score: LegacyMatchScore, maxCombo: number) => {
               // There's no note acc, every caught note is the same score. Thus no misses means max score
               // Large droplet misses seem to be included in countmiss
               if (score.countmiss < 1) return 800000;
               // From https://gist.github.com/bdach/414d5289f65b0399fa8f9732245a4f7c
               const log4_200 = Math.log(200) / Math.log(4);
               const F = (x: number) => {
                  // For values between 0 and 200, use x(lnx - 1) / ln4, and add 1 to bring x=1,2 above 0
                  if (x < 200) return (x * (Math.log(x) - 1)) / Math.log(4) + 1;
                  // If x is above 200, everything 200 onwards is the same value. So multiply directly
                  else return (200 * (Math.log(200) - 1)) / Math.log(4) + 1 + log4_200 * (x - 200);
               };
               const Fmax = F(maxCombo);
               const delta = (x: number) =>
                  x > 200 ? delta(200) : (x * (1 + Math.log(200) - Math.log(x))) / Math.log(4);
               // How long are the remaining combos?
               const comboSize = (maxCombo - score.maxcombo) / score.countmiss;
               return 800000 * (1 - ((score.countmiss - 1) * delta(comboSize)) / Fmax);
            },
            missComponent: 0
         },
         taiko: {
            accCalc: (score: LegacyMatchScore) =>
               500000 *
               Math.pow(
                  (score.count300 + score.count100 / 3) / (score.count300 + score.count100 + score.countmiss),
                  10
               ),
            comboCalc: (score: LegacyMatchScore, maxCombo: number) => {
               const scorePart = 500000;
               // Seems like the taiko scoring is more like ctb right now, but combo goes up to 400
               if (score.countmiss < 1) return scorePart;
               const maxScorePerNote = 12 + Math.log(400) / Math.log(4);
               const scoreUptoCombo = (x: number) => {
                  // For values between 0 and 400
                  const f = (n: number) => n * ((Math.log(n) - 1) / Math.log(4) + 12);
                  if (x < 400) return f(x);
                  else return f(400) + maxScorePerNote * (x - 400);
               };
               const delta = (x: number) =>
                  x > 400 ? delta(400) : (x * (1 + Math.log(400) - Math.log(x))) / Math.log(4);
               const maxComboScore = scoreUptoCombo(maxCombo);
               const comboSize = (maxCombo - score.maxcombo) / score.countmiss;
               const comboComponent = 1 - ((score.countmiss - 1) * delta(comboSize)) / maxComboScore;
               const greatRate = score.count300 / (score.count300 + score.count100);
               const accMult = (2 * greatRate + 1) / 3;
               return scorePart * comboComponent * accMult;
               // I choose to ignore the floor component. I'm also ignoring large notes and kiai multiplier.
               // Perhaps all these will even each other out in the long run
               // const scoreCapPerNote = 310;
               // const scoreSumToCombo = (x: number) => {
               //    if (x < 100) return (x * (x + 6000)) / 20;
               //    else return 30500 + scoreCapPerNote * (x - 100);
               // };
               // const Fmax = scoreSumToCombo(maxCombo);
               // const delta = (x: number) => (x > 100 ? delta(100) : (x * (200 - x)) / 20);
               // // Lifted straight from above
               // const comboSize = (maxCombo - score.maxcombo) / score.countmiss;
               // const comboComponent =
               //    comboSize < 1
               //       ? (Fmax - scoreSumToCombo(score.maxcombo)) / Fmax
               //       : 1 - ((score.countmiss - 1) * delta(comboSize)) / Fmax;
               // // We don't know where the GOODs came from, they are each worth exactly half of a GREAT
               // // Just multiply by the ratio
               // const greatRate = ;
               // const accMult = greatRate / 2 + 0.5;
               // return 700000 * accMult * comboComponent;
            },
            missComponent: 0
         },
         mania: {
            // For mania just return score v1
            accCalc: (score: LegacyMatchScore) => score.score,
            comboCalc: (score: LegacyMatchScore, maxCombo: number) => 0,
            missComponent: 0
         }
      }[this.#mode];

      const accScore = accCalc(this.#score);
      const comboScore = comboCalc(this.#score, this.#map.maxCombo);
      const missScore = missComponent / Math.sqrt(this.#score.countmiss + 1);
      return parseInt(((accScore + comboScore + missScore) / this.#modMult).toFixed());
   }
}
