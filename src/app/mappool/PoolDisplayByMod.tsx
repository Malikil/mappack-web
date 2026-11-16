import ModPool from "@/components/mappool/Modpool";
import { BeatmapByMode } from "@/types/database/beatmap";
import { ModPool as ModPoolType } from "@/types/rating";
import { GameMode } from "osu-web.js";

export default function PoolDisplayByMod<M extends GameMode>({
   title,
   target,
   maplist,
   mode
}: {
   title: string;
   target?: number;
   maplist: Partial<Record<ModPoolType, BeatmapByMode[NoInfer<M>][]>>;
   mode: M;
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
                           fm: "Freemod",
                           tb: "Tiebreaker"
                        }[mod]
                     }
                     key={mod}
                     mode={mode}
                  />
               ))}
         </div>
      </div>
   );
}
