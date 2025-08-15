import { calcModStat } from "osu-web.js";
import MapCard from "./MapCard";
import { DbBeatmap } from "@/types/database.beatmap";

export default function ModPool(props: {
   mod: string;
   maps: DbBeatmap[];
   modshort: "nm" | "hd" | "hr" | "dt" | "fm";
   mapActions?: {
      title: string;
      action: (map: DbBeatmap) => any;
      condition?: (map: DbBeatmap) => boolean;
   }[];
}) {
   const maps = props.maps.map(m => {
      const result = { ...m };
      if (props.modshort === "dt") {
         result.bpm = calcModStat.dt.bpm(result.bpm);
         result.length = calcModStat.dt.length(result.length);
         result.ar = calcModStat.dt.ar(result.ar);
      } else if (props.modshort === "hr") {
         result.ar = calcModStat.hr.ar(result.ar);
         result.cs = calcModStat.hr.cs(result.cs);
      }
      return result;
   });
   return (
      <div>
         <h2>{props.mod}</h2>
         <div className="d-flex gap-2 flex-wrap">
            {maps.map(m => (
               <MapCard
                  beatmap={m}
                  key={m._id}
                  mapActions={props.mapActions}
                  hideRatings
                  starsPlus={props.modshort === "hr" || props.modshort === "dt"}
                  //rating={props.rating}
               />
            ))}
         </div>
      </div>
   );
}
