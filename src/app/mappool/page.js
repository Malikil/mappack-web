import MapCard from "@/components/mappool/MapCard";
import db from "../api/db/connection";

export default async function Mappool() {
   const pools = db.collection("maps");
   const pool = await pools.findOne({ current: true });

   return (
      <div className="d-flex flex-wrap">
         {pool?.maps.map(m => <MapCard key={m.id} beatmap={m} />) || "Couldn't fetch mappool"}
      </div>
   );
}
