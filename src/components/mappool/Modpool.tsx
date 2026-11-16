import { calcModStat, GameMode } from "osu-web.js";
import MapCard from "./MapCard";
import { BeatmapByMode } from "@/types/database/beatmap";

export default function ModPool<M extends GameMode>(props: {
   mod: string;
   maps: BeatmapByMode[NoInfer<M>][];
   modshort: "nm" | "hd" | "hr" | "dt" | "fm";
   mapActions?: {
      title: string;
      action: (map: BeatmapByMode[NoInfer<M>]) => any;
      condition?: (map: BeatmapByMode[NoInfer<M>]) => boolean;
   }[];
   mode: M;
}) {
   const maps = props.maps.map(m => {
      const result = { ...m };
      if (props.modshort === "dt") {
         result.bpm = calcModStat.dt.bpm(result.bpm);
         result.length = calcModStat.dt.length(result.length);
         if ("ar" in result) result.ar = calcModStat.dt.ar(result.ar);
      } else if (props.modshort === "hr") {
         if ("ar" in result) result.ar = calcModStat.hr.ar(result.ar);
         if ("cs" in result) result.cs = calcModStat.hr.cs(result.cs);
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
                  mode={props.mode}
               />
            ))}
         </div>
      </div>
   );
}
