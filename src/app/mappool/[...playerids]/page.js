import db from "@/app/api/db/connection";
import ModPool from "@/components/mappool/Modpool";
import { redirect } from "next/navigation";

export default async function PlayerPool({ params }) {
   /** @type {number[]} */
   const playerids = (await params).playerids.map(id => parseInt(id));
   if (playerids.includes(NaN)) redirect("/mappool");

   const playersDb = db.collection("players");
   const players = await playersDb.find({ osuid: { $in: playerids } }).toArray();
   if (players.length < 1) redirect("/mappool");

   const targetRatingSum = players.reduce(
      (agg, player) => {
         agg.rating += player.pvp.rating;
         agg.variance += player.pvp.rd * player.pvp.rd;
         return agg;
      },
      { rating: 0, variance: 0 }
   );
   const targetRating = {
      rating: targetRatingSum.rating / players.length,
      rd: Math.sqrt(targetRatingSum.variance)
   };
   const withinRange = rating => Math.abs(targetRating.rating - rating) <= targetRating.rd;

   const mapsDb = db.collection("maps");
   const currentPack = await mapsDb.findOne({ active: "current" });
   const longMaplist = currentPack.maps.reduce(
      (agg, map) => {
         // NM
         if (withinRange(map.ratings.nm.rating)) agg.nm.push(map);
         // HD/HR/FM
         if (withinRange(map.ratings.hd.rating))
            if (withinRange(map.ratings.hr.rating)) agg.fm.push(map);
            else agg.hd.push(map);
         else if (withinRange(map.ratings.hr.rating)) agg.hr.push(map);
         // DT
         if (withinRange(map.ratings.dt.rating)) agg.dt.push(map);
         return agg;
      },
      { nm: [], hd: [], hr: [], dt: [], fm: [] }
   );
   // Limit to 7 maps per modpool
   const maplist = Object.fromEntries(
      Object.keys(longMaplist).map(mod => {
         if (mod === "fm") {
            longMaplist.fm.sort((a, b) => {
               const adiff = Math.abs(
                  targetRating.rating - (a.ratings.hd.rating + a.ratings.hr.rating) / 2
               );
               const bdiff = Math.abs(
                  targetRating.rating - (b.ratings.hd.rating + b.ratings.hr.rating) / 2
               );
               return adiff - bdiff;
            });
         } else
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
         <div className="fs-3">Pool for: {players.map(p => p.osuname).join(", ")}</div>
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
               />
            ))}
         </div>
      </div>
   );
}
