import { calcModStat } from "osu-web.js";
import MapCard from "./MapCard";

/**
 * @param {object} props
 * @param {string} props.mod
 * @param {import("@/types/database.beatmap").DbBeatmap[]} props.maps
 * @param {'nm'|'hd'|'hr'|'dt'|'fm'} props.modshort
 * @param {object[]} [props.mapActions]
 * @param {string} props.mapActions.title
 * @param {function(import("@/types/database.beatmap").DbBeatmap)} props.mapActions.action
 * @param {function(import("@/types/database.beatmap").DbBeatmap): boolean} [props.mapActions.condition]
 */
export default function ModPool(props) {
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
                  key={m.id}
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
