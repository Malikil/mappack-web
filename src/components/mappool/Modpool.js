import MapCard from "./MapCard";

/**
 * @param {object} props
 * @param {string} props.mod
 * @param {import("@/types/database.beatmap").DbBeatmap[]} props.maps
 * @param {object[]} [props.mapActions]
 * @param {string} props.mapActions.title
 * @param {function} props.mapActions.action
 * @param {function} props.mapActions.condition
 */
export default function ModPool(props) {
   return (
      <div>
         <h2>{props.mod}</h2>
         <div className="d-flex gap-2 flex-wrap">
            {props.maps.map(m => (
               <MapCard beatmap={m} key={m.id} mapActions={props.mapActions} hideRatings />
            ))}
         </div>
      </div>
   );
}
