import ModPool from "@/components/mappool/Modpool";

export default async function LobbyPool({ searchParams }) {
   const stringParams = await searchParams;
   const parsedParams = Object.fromEntries(
      Object.keys(stringParams).map(k => [
         k,
         (stringParams[k].split(",") || []).map(v => parseInt(v))
      ])
   );
   parsedParams.l = decodeURIComponent(stringParams.l);

   // Get all maps. If pools are rotated while the match is ongoing, the previous maps will still need
   // to be visible on the lobby's pool page
   const mapsCollection = db.collection("maps");
   const pools = await mapsCollection.find().toArray();
   const mappools = [].concat(...pools.map(p => p.maps));
   const maplist = {
      nm: [],
      hd: [],
      hr: [],
      dt: [],
      fm: []
   };
   Object.keys(maplist).forEach(
      mod => (maplist[mod] = parsedParams[mod].map(m => mappools.find(p => p.id === m)))
   );

   return (
      <div>
         <div className="fs-3">{parsedParams.l}</div>
         <div className="d-flex flex-column gap-3">
            {Object.keys(maplist).map(mod => (
               <ModPool
                  maps={maplist[mod]}
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
