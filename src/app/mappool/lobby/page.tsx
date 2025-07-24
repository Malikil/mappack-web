import { mapsDb } from "@/app/api/db/connection";
import ModPool from "@/components/mappool/Modpool";
import { DbBeatmap } from "@/types/database.beatmap";
import { ModPool as ModPoolType } from "@/types/rating";

const MODLIST: ModPoolType[] = ["nm", "hd", "hr", "dt", "fm"];

export default async function LobbyPool({ searchParams }) {
   const stringParams = await searchParams;
   const parsedParams = Object.fromEntries(
      Object.keys(stringParams).map(k => [k, (stringParams[k].split(",") || []).map(v => parseInt(v))])
   ) as Partial<Record<ModPoolType, number[]>> & { l?: string };
   parsedParams.l = decodeURIComponent(stringParams.l);

   // Get all maps. If pools are rotated while the match is ongoing, the previous maps will still need
   // to be visible on the lobby's pool page
   const mapIds = MODLIST.flatMap(mod => parsedParams[mod] || []);
   const maps = await mapsDb
      .find({ $or: mapIds.map(id => ({ id, mode: stringParams.m || "osu" })) }, { projection: { _id: 0 } })
      .toArray();
   const maplist: Record<ModPoolType, DbBeatmap[]> = {
      nm: [],
      hd: [],
      hr: [],
      dt: [],
      fm: []
   };
   MODLIST.forEach(
      mod => (maplist[mod] = parsedParams[mod]?.map(m => maps.find(p => p.id === m)).filter(m => m) || [])
   );
   console.log(maplist);

   return (
      <div>
         <div className="fs-3">{parsedParams.l}</div>
         <div className="d-flex flex-column gap-3">
            {Object.keys(maplist).map((mod: ModPoolType) => (
               <ModPool
                  key={mod}
                  maps={maplist[mod]}
                  modshort={mod}
                  mod={
                     {
                        nm: "NoMod",
                        hd: "Hidden",
                        hr: "HardRock",
                        dt: "DoubleTime",
                        fm: "Freemod"
                     }[mod]
                  }
               />
            ))}
         </div>
      </div>
   );
}
