import { predictOutcome, scoreFromResult } from "@/helpers/rating-range";
import { getCurrentPack } from "@/helpers/server/currentPack";
import { ModPool, Rating } from "@/types/rating";
import { DbBeatmap } from "@/types/database.beatmap";
import { GameMode, Mod } from "osu-web.js";

type ExpectedScores = {
   NM: number;
   HD: number;
   HR: number;
   DT: number;
};
type MapWithScores = DbBeatmap & { expectedScores: ExpectedScores };

export async function getMappool(targetRating: Rating, mode: GameMode, keyCount = 0) {
   console.log("Get mappool for target:", targetRating);
   const loggingMap = (m: MapWithScores) => ({
      artist: m.artist,
      title: m.title,
      version: m.version,
      stars: m.stars,
      rating: m.rating,
      expectedScores: m.expectedScores
   });
   const { nmCount, hdCount, hrCount, dtCount, fmCount } =
      mode === "mania"
         ? {
              nmCount: 12,
              hdCount: 0,
              hrCount: 0,
              dtCount: 0,
              fmCount: 0
           }
         : {
              nmCount: 4,
              hdCount: 3,
              hrCount: 3,
              dtCount: 3,
              fmCount: 3
           };
   const usedSets = new Set<number>();
   const pick = (
      list: MapWithScores[],
      sorter: (a: { expectedScores: ExpectedScores }, b: { expectedScores: ExpectedScores }) => number,
      count: number
   ) => {
      const available = list.filter(m => !usedSets.has(m.setid));
      console.log(`${available.length} available maps`);
      const picked = available.toSorted(sorter).slice(0, count);

      picked.forEach(m => usedSets.add(m.setid));
      return picked;
   };

   const modeTargetScore = scoreFromResult(0.5, mode);
   const sortFunc =
      (mod: Mod | "NM") => (a: { expectedScores: ExpectedScores }, b: { expectedScores: ExpectedScores }) => {
         const adiff = Math.abs(a.expectedScores[mod] - modeTargetScore);
         const bdiff = Math.abs(b.expectedScores[mod] - modeTargetScore);
         return adiff - bdiff;
      };

   const currentPack = await getCurrentPack(mode, keyCount);
   const maplist = currentPack.map(m => {
      const outcome = predictOutcome(targetRating, m.rating);
      return {
         ...m,
         expectedScores: {
            NM: scoreFromResult(outcome, mode, { mods: [], map: m.mods, player: {} }),
            HD: scoreFromResult(outcome, mode, { mods: ["HD"], map: m.mods, player: {} }),
            HR: scoreFromResult(outcome, mode, { mods: ["HR"], map: m.mods, player: {} }),
            DT: scoreFromResult(outcome, mode, { mods: ["DT"], map: m.mods, player: {} })
         }
      };
   });
   const resultList: {
      nm: MapWithScores[];
      hd: MapWithScores[];
      hr: MapWithScores[];
      dt: MapWithScores[];
      fm: MapWithScores[];
   } = {
      nm: [],
      hd: [],
      hr: [],
      dt: [],
      fm: []
   };

   // Sort FM first, so the extra maps can be put into HD/HR
   console.log(`Pick ${fmCount} FM maps`);
   resultList.fm = pick(
      maplist,
      (a, b) => {
         // Special sort for FM
         const diff = (song: { expectedScores: Partial<Record<Mod, number>> }) => {
            const hdDiff = Math.abs(song.expectedScores.HD - modeTargetScore);
            const hrDiff = Math.abs(song.expectedScores.HR - modeTargetScore);
            return [hdDiff + hrDiff, Math.min(hdDiff, hrDiff)];
         };
         const aSort = diff(a);
         const bSort = diff(b);
         if (aSort[0] > bSort[0]) return 1;
         else if (aSort[0] < bSort[0]) return -1;
         else if (aSort[1] > bSort[1]) return 1;
         else if (aSort[1] < bSort[1]) return -1;
         else return 0;
      },
      fmCount
   );
   console.log(resultList.fm.map(loggingMap));
   // Sort DT next, as this is likely to be a more restricted pool
   console.log(`Pick ${dtCount} DT maps`);
   resultList.dt = pick(maplist, sortFunc("DT"), dtCount);
   console.log(resultList.dt.map(loggingMap));
   // I find HR harder. Skill issue
   console.log(`Pick ${hrCount} HR maps`);
   resultList.hr = pick(maplist, sortFunc("HR"), hrCount);
   console.log(resultList.hr.map(loggingMap));
   // HD is the last mod
   console.log(`Pick ${hdCount} HD maps`);
   resultList.hd = pick(maplist, sortFunc("HD"), hdCount);
   console.log(resultList.hd.map(loggingMap));
   // Everything else into NM
   console.log(`Pick ${nmCount} NM maps`);
   resultList.nm = pick(maplist, sortFunc("NM"), nmCount);
   console.log(resultList.nm.map(loggingMap));

   return {
      maps: resultList as Record<ModPool, DbBeatmap[]>,
      target: targetRating
   };
}
