import ModPool from "@/components/mappool/Modpool";
import { getCurrentPack } from "@/helpers/currentPack";

export default async function PlayerPool({ searchParams }) {
   const stringParams = await searchParams;
   const parsedParams = Object.fromEntries(
      Object.keys(stringParams).map(k => [
         k,
         (stringParams[k].split(",") || []).map(v => parseInt(v))
      ])
   );
   parsedParams.l = decodeURIComponent(stringParams.l);

   const mappools = await getCurrentPack();
   const maplist = {
      nm: [],
      hd: [],
      hr: [],
      dt: [],
      fm: []
   };
   Object.keys(maplist).forEach(
      mod => (maplist[mod] = parsedParams[mod].map(m => mappools.find(p => p.id === m)))
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
