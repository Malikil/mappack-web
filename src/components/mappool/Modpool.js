import MapCard from "./MapCard";

/**
 * @param {object} props
 * @param {string} props.mod
 * @param {import("@/types/database.beatmap").DbBeatmap[]} props.maps
 * @param {object[]} [props.mapActions]
 * @param {string} props.mapActions.title
 * @param {function(import("@/types/database.beatmap").DbBeatmap)} props.mapActions.action
 * @param {function(import("@/types/database.beatmap").DbBeatmap): boolean} [props.mapActions.condition]
 */
export default function ModPool(props) {
   return (
      <div>
         <h2>{props.mod}</h2>
         <div className="d-flex gap-2 flex-wrap">
            {props.maps.map(m => (
               <MapCard beatmap={m} key={m.id} mapActions={props.mapActions} hideRatings mod={props.modshort} rating={props.rating} />
            ))}
         </div>
      </div>
   );
}
