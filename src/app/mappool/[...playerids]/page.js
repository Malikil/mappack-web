import ModPool from "@/components/mappool/Modpool";
import { redirect } from "next/navigation";
import { combineRatings } from "@/helpers/rating-range";
import { getMappool } from "@/app/api/db/mappool/functions";

export default async function PlayerPool({ params }) {
   /** @type {number[]} */
   const playerids = (await params).playerids.map(id => parseInt(id));
   if (playerids.includes(NaN)) redirect("/mappool");

   const { maps: maplist, players, error } = await getMappool(playerids);
   if (error) redirect("/mappool");

   const targetRating = combineRatings(...players.map(p => p.pvp));

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
               />
            ))}
         </div>
      </div>
   );
}
