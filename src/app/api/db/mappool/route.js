import { combineRatings, withinRange } from "@/helpers/rating-range";
import db from "../connection";
import { NextResponse } from "next/server";

/**
 * @param {import('next/server').NextRequest} req
 */
export const GET = async req => {
   const params = req.nextUrl.searchParams;
   const playerIds = params
      .getAll("p")
      .map(p => parseInt(p))
      .filter(p => p);

   const playersDb = db.collection("players");
   const players = await playersDb.find({ osuid: { $in: playerIds } }).toArray();
   if (players.length < 1) return new NextResponse({ message: "No players" }, { status: 404 });

   const targetRating = combineRatings(...players.map(p => p.pvp));
   const checkWithinRange = rating => withinRange(targetRating, rating);

   const mapsDb = db.collection("maps");
   const currentPack = await mapsDb.findOne({ active: "current" });
   const longMaplist = currentPack.maps.reduce(
      (agg, map) => {
         // NM
         if (checkWithinRange(map.ratings.nm)) agg.nm.push(map);
         // HD/HR/FM
         if (checkWithinRange(map.ratings.hd))
            if (checkWithinRange(map.ratings.hr)) agg.fm.push(map);
            else agg.hd.push(map);
         else if (checkWithinRange(map.ratings.hr)) agg.hr.push(map);
         // DT
         if (checkWithinRange(map.ratings.dt)) agg.dt.push(map);
         return agg;
      },
      { nm: [], hd: [], hr: [], dt: [], fm: [] }
   );
   // Limit to 7 maps per modpool
   // Sort FM first, so the extra maps can be put into HD/HR
   longMaplist.fm.sort((a, b) => {
      const adiff = Math.abs(targetRating.rating - (a.ratings.hd.rating + a.ratings.hr.rating) / 2);
      const bdiff = Math.abs(targetRating.rating - (b.ratings.hd.rating + b.ratings.hr.rating) / 2);
      return adiff - bdiff;
   });
   // Put extra maps into HD/HR
   longMaplist.fm.slice(7).forEach(map => {
      const hdDiff = Math.abs(map.ratings.hd.rating - targetRating.rating);
      const hrDiff = Math.abs(map.ratings.hr.rating - targetRating.rating);
      if (hdDiff > hrDiff) longMaplist.hr.push(map);
      else longMaplist.hd.push(map);
   });
   const maplist = Object.fromEntries(
      Object.keys(longMaplist).map(mod => {
         // FM is already sorted
         if (mod !== "fm")
            longMaplist[mod].sort((a, b) => {
               const adiff = Math.abs(targetRating.rating - a.ratings[mod].rating);
               const bdiff = Math.abs(targetRating.rating - b.ratings[mod].rating);
               return adiff - bdiff;
            });
         return [mod, longMaplist[mod].slice(0, 7)];
      })
   );

   return NextResponse.json(maplist);
};
