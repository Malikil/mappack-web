import ModPool from "./Modpool";

/**
 * @param {object} props
 * @param {object} props.maps
 * @param {import('osu-web.js').Beatmap[]} props.maps.nm
 * @param {import('osu-web.js').Beatmap[]} props.maps.hd
 * @param {import('osu-web.js').Beatmap[]} props.maps.hr
 * @param {import('osu-web.js').Beatmap[]} props.maps.dt
 * @param {import('osu-web.js').Beatmap[]} props.maps.other
 * @param {object[]} props.mapActions
 * @param {string} props.mapActions.title
 * @param {function} props.mapActions.action
 * @param {function} props.mapActions.condition
 */
export default function MapList({ maps, mapActions }) {
   return (
      <div className="d-flex flex-column gap-4">
         <ModPool mod="NoMod" maps={maps.nm} minCount={2} mapActions={mapActions} />
         <ModPool mod="Hidden" maps={maps.hd} minCount={2} mapActions={mapActions} />
         <ModPool mod="Hard Rock" maps={maps.hr} minCount={2} mapActions={mapActions} />
         <ModPool mod="Double Time" maps={maps.dt} minCount={2} mapActions={mapActions} />
         {maps.other.length > 0 && <ModPool mod="Other" maps={maps.other} mapActions={mapActions} showMods />}
      </div>
   );
}
