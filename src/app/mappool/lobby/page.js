import db from "@/app/api/db/connection";
import ModPool from "@/components/mappool/Modpool";
import { combineRatings } from "@/helpers/rating-range";

export default async function PlayerPool({ searchParams }) {
   const stringParams = await searchParams;
   const parsedParams = Object.fromEntries(
      Object.keys(stringParams).map(k => [
         k,
         (stringParams[k].split(",") || []).map(v => parseInt(v))
      ])
   );
   parsedParams.l = decodeURIComponent(stringParams.l);
   console.log(parsedParams);

   const mapsDb = db.collection("maps");
   const { maps } = await mapsDb.findOne({ active: "current" });

   const maplist = {
      nm: maps.filter(map => parsedParams.nm?.includes(map.id)),
      hd: maps.filter(map => parsedParams.hd?.includes(map.id)),
      hr: maps.filter(map => parsedParams.hr?.includes(map.id)),
      dt: maps.filter(map => parsedParams.dt?.includes(map.id)),
      fm: maps.filter(map => parsedParams.fm?.includes(map.id))
   };

   return (
      <div>
         <div className="fs-3">{parsedParams.l}</div>
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
