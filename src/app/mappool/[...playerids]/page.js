import db from "@/app/api/db/connection";
import ModPool from "@/components/mappool/Modpool";
import { redirect } from "next/navigation";
//import { predictScore } from "./predict";
import { combineRatings, withinRange } from "@/helpers/rating-range";

export default async function PlayerPool({ params }) {
   /** @type {number[]} */
   const playerids = (await params).playerids.map(id => parseInt(id));
   if (playerids.includes(NaN)) redirect("/mappool");

   const playersDb = db.collection("players");
   const players = await playersDb.find({ osuid: { $in: playerids } }).toArray();
   if (players.length < 1) redirect("/mappool");

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

   return (
      <div>
         <div className="d-flex justify-content-between">
            <div className="fs-3">Pool for: {players.map(p => p.osuname).join(", ")}</div>
            <div>
               <small>Target rating: {targetRating.rating.toFixed()}</small>
            </div>
         </div>
         <div className="d-flex flex-column gap-3">
            {Object.keys(maplist).map(mod => (
               <ModPool
                  maps={maplist[mod]}
                  mod={
                     {
                        nm: "NoMod",
                        hd: "Hidden",
                        hr: "HardRock",
                        dt: "DoubleTime",
                        fm: "Freemod"
                     }[mod]
                  }
                  key={mod}
                  // mapActions={[
                  //    {
                  //       title: "Predict Score",
                  //       action: predictScore
                  //    }
                  // ]}
                  // modshort={mod}
                  // rating={targetRating}
               />
            ))}
         </div>
      </div>
   );
}
