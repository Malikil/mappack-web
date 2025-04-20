import MapCard from "@/components/mappool/MapCard";
import db from "../api/db/connection";
import Link from "next/link";
import { auth } from "@/auth";
import averageRating from "@/helpers/average-rating";

export default async function Mappool() {
   const session = await auth();
   const pools = db.collection("maps");
   const pool = await pools.findOne({ active: "current" });
   let playerRating = null;
   if (session) {
      const player = await db.collection("players").findOne({ osuid: session.user.id });
      if (player) playerRating = player.pve;
   }

   return (
      <div>
         <div className="mb-2">
            <div className="fs-2">{pool.name}</div>
            <div className="d-flex justify-content-between">
               <Link className="ms-1" href={pool.download}>
                  Download
               </Link>
               <div>
                  <small>Highlighted maps may be selected for Score Attack</small>
               </div>
            </div>
            <hr />
         </div>
         <div className="d-flex flex-wrap gap-2">
            {pool.maps
               .sort((a, b) => averageRating(a) - averageRating(b))
               .map(m => <MapCard key={m.id} beatmap={m} rating={playerRating} />) ||
               "Couldn't fetch mappool"}
         </div>
      </div>
   );
}
