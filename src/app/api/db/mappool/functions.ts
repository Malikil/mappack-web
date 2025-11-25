import { withinRange } from "@/helpers/rating-range";
import { getCurrentPack } from "@/helpers/server/currentPack";
import { ModPool, Rating, SimpleMod } from "@/types/rating";
import { DbBeatmap } from "@/types/database.beatmap";
import { GameMode } from "osu-web.js";

export async function getMappool(targetRating: { rating: number; rd: number }, mode: GameMode, keyCount = 0) {
   console.log("Get mappool for target:", targetRating);
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
   const checkWithinRange = (rating: Rating) => withinRange(targetRating, rating);
   const sortFunc = (mod: SimpleMod) => (a: DbBeatmap, b: DbBeatmap) => {
      const adiff = Math.abs(targetRating.rating - a.rating.rating * a.mods[mod.toUpperCase()]);
      const bdiff = Math.abs(targetRating.rating - b.rating.rating * b.mods[mod.toUpperCase()]);
      return adiff - bdiff;
   };
   const filterFunc =
      (maplist: Record<ModPool, DbBeatmap[]>, ...mods: ModPool[]) =>
      (candidate: DbBeatmap) => {
         const counts = {
            nm: nmCount,
            hd: hdCount,
            hr: hrCount,
            dt: dtCount,
            fm: fmCount
         };
         return mods.every(mod => {
            // See if the map being filtered is in the list already
            const i = maplist[mod].findIndex(m => m.setid === candidate.setid);
            return i < 0 || i >= counts[mod];
         });
      };

   const currentMaps = await getCurrentPack(mode, keyCount);
   const maplist = currentMaps.reduce(
      (agg: Record<ModPool, DbBeatmap[]>, map) => {
         const candidate = {
            nm: checkWithinRange(map.rating),
            hd: checkWithinRange({ ...map.rating, rating: map.rating.rating * (map.mods.HD || 1) }),
            hr: checkWithinRange({ ...map.rating, rating: map.rating.rating * (map.mods.HR || 1) }),
            dt: checkWithinRange({ ...map.rating, rating: map.rating.rating * (map.mods.DT || 1) })
         };
         console.log(map.rating, candidate);
         // HD/HR/FM
         if (candidate.hd)
            if (candidate.hr) agg.fm.push(map);
            else agg.hd.push(map);
         else if (candidate.hr) agg.hr.push(map);
         // NM is lower priority
         else if (candidate.nm) agg.nm.push(map);
         // DT is separate
         if (candidate.dt) agg.dt.push(map);
         return agg;
      },
      { nm: [], hd: [], hr: [], dt: [], fm: [] }
   );

   // Sort FM first, so the extra maps can be put into HD/HR
   console.log(`${maplist.fm.length} available FM maps`);
   maplist.fm.sort((a, b) => {
      // Special sort for FM
      // Minimize the difference between difference to target and difference to each other
      const eligibility = (song: DbBeatmap) => {
         // How close are mod difficulties
         const modMults = [song.mods.HD || 1, song.mods.HR || 1];
         const modsDiff = Math.abs(modMults[0] - modMults[1]);
         const avgMult = (modMults[0] + modMults[1]) / 2;
         const modError = modsDiff / avgMult;
         // How close to the target rating
         const ratingDiff = Math.abs(song.rating.rating * avgMult - targetRating.rating);
         const ratingError = ratingDiff / targetRating.rating;
         return modError + ratingError;
      };
      // const adiff =
      //    Math.abs(targetRating.rating - (a.ratings.hd.rating + a.ratings.hr.rating) / 2) / 2 +
      //    Math.abs(a.ratings.hd.rating - a.ratings.hr.rating);
      // const bdiff =
      //    Math.abs(targetRating.rating - (b.ratings.hd.rating + b.ratings.hr.rating) / 2) / 2 +
      //    Math.abs(b.ratings.hd.rating - b.ratings.hr.rating);
      return eligibility(a) - eligibility(b);
   });
   // Put extra maps into HD/HR whichever is closer
   console.log(`Before redistributing FM maps: HD-${maplist.hd.length} HR-${maplist.hr.length}`);
   maplist.fm.slice(fmCount).forEach(map => {
      const hdDiff = Math.abs(map.rating.rating * (map.mods.HD || 1) - targetRating.rating);
      const hrDiff = Math.abs(map.rating.rating * (map.mods.HR || 1) - targetRating.rating);
      if (hdDiff > hrDiff) maplist.hr.push(map);
      else maplist.hd.push(map);
   });
   console.log(`After redistributing FM maps: HD-${maplist.hd.length} HR-${maplist.hr.length}`);
   // Sort DT next, as this is likely to be a more restricted pool
   console.log(`${maplist.dt.length} available DT maps`);
   maplist.dt = maplist.dt.filter(filterFunc(maplist, "fm")).sort(sortFunc("dt"));
   console.log(`${maplist.dt.length} after filtering`);
   // Remove duplicates from the same mapset and sort for HD/HR
   console.log(`${maplist.hr.length} available HR maps`);
   maplist.hr = maplist.hr.filter(filterFunc(maplist, "dt", "fm")).sort(sortFunc("hr"));
   console.log(`${maplist.hr.length} after filtering`);
   // Put extras into NM if valid
   console.log(`Before redistributing HR maps: NM-${maplist.nm.length}`);
   maplist.hr.slice(hrCount).forEach(map => {
      if (checkWithinRange(map.rating)) maplist.nm.push(map);
   });
   console.log(`After redistributing HR maps: NM-${maplist.nm.length}`);
   console.log(`${maplist.hd.length} available HD maps`);
   maplist.hd = maplist.hd.filter(filterFunc(maplist, "dt", "fm", "hr")).sort(sortFunc("hd"));
   console.log(`${maplist.hd.length} after filtering`);
   // Put extra maps into NM if they're valid
   console.log(`Before redistributing HD maps: NM-${maplist.nm.length}`);
   maplist.hd.slice(hdCount).forEach(map => {
      if (checkWithinRange(map.rating)) maplist.nm.push(map);
   });
   console.log(`After redistributing HD maps: NM-${maplist.nm.length}`);
   // Sort NM
   console.log(`${maplist.nm.length} available NM maps`);
   maplist.nm = maplist.nm.filter(filterFunc(maplist, "hd", "hr", "dt", "fm")).sort(sortFunc("nm"));
   console.log(`${maplist.nm.length} after filtering`);

   return {
      maps: {
         nm: maplist.nm.slice(0, nmCount),
         hd: maplist.hd.slice(0, hdCount),
         hr: maplist.hr.slice(0, hrCount),
         dt: maplist.dt.slice(0, dtCount),
         fm: maplist.fm.slice(0, fmCount)
      } as Record<ModPool, DbBeatmap[]>,
      target: targetRating
   };
}
