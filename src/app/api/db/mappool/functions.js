import { combineRatings, withinRange } from "@/helpers/rating-range";
import db from "../connection";

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

   const mapsDb = db.collection("maps");
   const currentPack = await mapsDb.findOne({ active: "current" });
   const maplist = currentPack.maps.reduce(
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
   // Limit to 7 maps per modpool
   // Sort FM first, so the extra maps can be put into HD/HR
   maplist.fm.sort((a, b) => {
      // Special sort for FM
      const adiff = Math.abs(targetRating.rating - (a.ratings.hd.rating + a.ratings.hr.rating) / 2);
      const bdiff = Math.abs(targetRating.rating - (b.ratings.hd.rating + b.ratings.hr.rating) / 2);
      return adiff - bdiff;
   });
   // Put extra maps into HD/HR
   maplist.fm.slice(7).forEach(map => {
      const hdDiff = Math.abs(map.ratings.hd.rating - targetRating.rating);
      const hrDiff = Math.abs(map.ratings.hr.rating - targetRating.rating);
      if (hdDiff > hrDiff) maplist.hr.push(map);
      else maplist.hd.push(map);
   });
   // Sort HD/HR
   maplist.hd.sort(sortFunc("hd"));
   maplist.hr.sort(sortFunc("hr"));
   // Put extra maps into NM if they're valid
   maplist.hd.slice(7).forEach(map => {
      if (checkWithinRange(map.ratings.nm)) maplist.nm.push(map);
   });
   maplist.hr.slice(7).forEach(map => {
      if (checkWithinRange(map.ratings.nm)) maplist.nm.push(map);
   });
   // Sort NM and DT (the only ones left)
   maplist.nm.sort(sortFunc("nm"));
   maplist.dt.sort(sortFunc("dt"));

   const maps = Object.fromEntries(
      Object.keys(maplist).map(mod => {
         return [mod, maplist[mod].slice(0, 7)];
      })
   );
   return { maps, players };
}
