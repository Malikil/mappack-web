import db from "@/app/api/db/connection";
import ModPool from "@/components/mappool/Modpool";

export default async function PlayerPool({ searchParams }) {
   const stringParams = await searchParams;
   const parsedParams = Object.fromEntries(
      Object.keys(stringParams).map(k => [
         k,
         (stringParams[k].split(",") || []).map(v => parseInt(v))
      ])
   );
   parsedParams.l = decodeURIComponent(stringParams.l);

   const mapsDb = db.collection("maps");
   const mappools = await mapsDb
      .find({ $or: [{ active: "fresh" }, { active: "stale" }] })
      .toArray();

   const maplist = {
      nm: [],
      hd: [],
      hr: [],
      dt: [],
      fm: []
   };
   mappools.forEach(({ maps }) =>
      Object.keys(maplist).forEach(mod =>
         maplist[mod].push(...maps.filter(map => parsedParams[mod]?.includes(map.id)))
      )
   );

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
