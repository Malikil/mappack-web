import ModPool from "@/components/mappool/Modpool";
import { DbBeatmap } from "@/types/database.beatmap";
import { ModPool as ModPoolType } from "@/types/rating";

export default function PoolDisplayByMod({
   title,
   target,
   maplist
}: {
   title: string;
   target?: number;
   maplist: Partial<Record<ModPoolType, DbBeatmap[]>>;
}) {
   return (
      <div>
         <div className="d-flex justify-content-between">
            <div className="fs-3">{title}</div>
            {target && (
               <div>
                  <small>Target rating: {target}</small>
               </div>
            )}
         </div>
         <div className="d-flex flex-column gap-3">
            {Object.keys(maplist)
               .filter(m => maplist[m].length > 0)
               .map((mod: ModPoolType) => (
                  <ModPool
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
                     key={mod}
                  />
               ))}
         </div>
      </div>
   );
}
