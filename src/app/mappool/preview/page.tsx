import ModPool from "@/components/mappool/Modpool";
import { getMappool } from "@/app/api/db/mappool/functions";
import { ModPool as ModPoolType } from "@/types/rating";
import { GameMode } from "osu-web.js";

export default async function PlayerPool({ searchParams }) {
   const stringParams = await searchParams;
   const mode: GameMode = ["osu", "fruits", "mania", "taiko"].includes(stringParams.m)
      ? stringParams.m
      : "osu";
   const rating: number = parseInt(stringParams.r) || 1500;
   const rd: number = parseInt(stringParams.d) || 125;
   const { maps: maplist } = await getMappool({ rating, rd }, mode);

   return (
      <div>
         <div className="d-flex justify-content-between">
            <div className="fs-3">Pool for: {mode} {rating} rd{rd}</div>
            <div>
               <small>Target rating: {rating}</small>
            </div>
         </div>
         <div className="d-flex flex-column gap-3">
            {Object.keys(maplist).map((mod: ModPoolType) => (
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
