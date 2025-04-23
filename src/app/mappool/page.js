import MapCard from "@/components/mappool/MapCard";
import db from "../api/db/connection";
import Link from "next/link";
import { auth } from "@/auth";
import averageRating from "@/helpers/average-rating";
import { Card, CardBody, CardSubtitle, CardTitle } from "react-bootstrap";

export default async function Mappool() {
   const session = await auth();
   const mapsCollection = db.collection("maps");
   const pools = await mapsCollection
      .find({ $or: [{ active: "fresh" }, { active: "stale" }] })
      .toArray();
   const newpools = mapsCollection.aggregate([
      { $match: { $or: [{ active: "fresh" }, { active: "stale" }] } },
      { $unwind: "maps" },
      {
         $group: {
            _id: ""
         }
      }
   ]);
   let playerRating = null;
   if (session) {
      const player = await db.collection("players").findOne({ osuid: session.user.id });
      if (player) playerRating = player.pve;
   }

   return (
      <div>
         {pools.map(pool => (
            <Card key={pool.name}>
               <CardTitle>{pool.name}</CardTitle>
               <CardSubtitle>
                  <Link href={pool.download}>Download</Link>
               </CardSubtitle>
               <CardBody>Maplist</CardBody>
            </Card>
         ))}
         <div className="mb-2">
            <div className="fs-2">{pools.map(p => p.name).join(" | ")}</div>
            <div className="d-flex justify-content-between">
               <div className="d-flex gap-1">
                  {pools.map((p, i) => (
                     <Link key={p.name} className="ms-1" href={p.download}>
                        Pack {i + 1}
                     </Link>
                  ))}
               </div>
               <div>
                  <small>Highlighted maps may be selected for Score Attack</small>
               </div>
            </div>
            <hr />
         </div>
         <div className="d-flex flex-wrap gap-2">
            {[]
               .concat(...pools.map(p => p.maps))
               .sort((a, b) => averageRating(a) - averageRating(b))
               .map(m => <MapCard key={m.id} beatmap={m} rating={playerRating} />) ||
               "Couldn't fetch mappool"}
         </div>
      </div>
   );
}
