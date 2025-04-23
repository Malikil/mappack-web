import { combineRatings, withinRange } from "@/helpers/rating-range";
import db from "../connection";
import { getCurrentPack } from "@/helpers/currentPack";

const NM_MAPCOUNT = 4,
   HD_MAPCOUNT = 3,
   HR_MAPCOUNT = 3,
   DT_MAPCOUNT = 3,
   FM_MAPCOUNT = 3;

/**
 * @param {number[]} playerIds
 */
export async function getMappool(playerIds) {
   const playersDb = db.collection("players");
   const players = await playersDb.find({ osuid: { $in: playerIds } }).toArray();
   if (players.length < 1) return { error: { status: 404, message: "No players" } };

   const targetRating = combineRatings(...players.map(p => p.pvp));
   const checkWithinRange = rating => withinRange(targetRating, rating);
   const sortFunc = mod => (a, b) => {
      const adiff = Math.abs(targetRating.rating - a.ratings[mod].rating);
      const bdiff = Math.abs(targetRating.rating - b.ratings[mod].rating);
      return adiff - bdiff;
   };
   const filterFunc =
      (maplist, ...mods) =>
      candidate => {
         const counts = {
            nm: NM_MAPCOUNT,
            hd: HD_MAPCOUNT,
            hr: HR_MAPCOUNT,
            dt: DT_MAPCOUNT,
            fm: FM_MAPCOUNT
         };
         return mods.every(mod => {
            // See if the map being filtered is in the list already
            const i = maplist[mod].findIndex(m => m.setid === candidate.setid);
            return i < 0 || i > counts[mod];
         });
      };

   const currentMaps = await getCurrentPack();
   const maplist = currentMaps.reduce(
      (agg, map) => {
         const candidate = {
            nm: checkWithinRange(map.ratings.nm),
            hd: checkWithinRange(map.ratings.hd),
            hr: checkWithinRange(map.ratings.hr),
            dt: checkWithinRange(map.ratings.dt)
         };
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
   maplist.fm.sort((a, b) => {
      // Special sort for FM
      const adiff = Math.abs(targetRating.rating - (a.ratings.hd.rating + a.ratings.hr.rating) / 2);
      const bdiff = Math.abs(targetRating.rating - (b.ratings.hd.rating + b.ratings.hr.rating) / 2);
      return adiff - bdiff;
   });
   // Put extra maps into HD/HR whichever is closer
   maplist.fm.slice(FM_MAPCOUNT).forEach(map => {
      const hdDiff = Math.abs(map.ratings.hd.rating - targetRating.rating);
      const hrDiff = Math.abs(map.ratings.hr.rating - targetRating.rating);
      if (hdDiff > hrDiff) maplist.hr.push(map);
      else maplist.hd.push(map);
   });
   // Sort DT next, as this is likely to be a more restricted pool
   maplist.dt = maplist.dt.filter(filterFunc(maplist, "fm")).sort(sortFunc("dt"));
   // Remove duplicates from the same mapset and sort for HD/HR
   maplist.hr = maplist.hr.filter(filterFunc(maplist, "dt", "fm")).sort(sortFunc("hr"));
   maplist.hd = maplist.hd.filter(filterFunc(maplist, "dt", "fm", "hr")).sort(sortFunc("hd"));
   // Put extra maps into NM if they're valid
   maplist.hd.slice(HD_MAPCOUNT).forEach(map => {
      if (checkWithinRange(map.ratings.nm)) maplist.nm.push(map);
   });
   maplist.hr.slice(HR_MAPCOUNT).forEach(map => {
      if (checkWithinRange(map.ratings.nm)) maplist.nm.push(map);
   });
   // Sort NM and DT (the only ones left)
   maplist.nm.filter(filterFunc(maplist, "hd", "hr", "dt", "fm")).sort(sortFunc("nm"));

   return {
      maps: {
         nm: maplist.nm.slice(0, NM_MAPCOUNT),
         hd: maplist.hd.slice(0, HD_MAPCOUNT),
         hr: maplist.hr.slice(0, HR_MAPCOUNT),
         dt: maplist.dt.slice(0, DT_MAPCOUNT),
         fm: maplist.fm.slice(0, FM_MAPCOUNT)
      },
      players
   };
}
