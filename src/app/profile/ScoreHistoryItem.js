import { Card, CardBody, CardImg, CardSubtitle, CardText, Container } from "react-bootstrap";
import db from "../api/db/connection";
import Link from "next/link";
import { buildUrl } from "osu-web.js";

export default async function ScoreHistoryItem({ match }) {
   const mapsDb = db.collection("maps");
   const maplist = await mapsDb.findOne({ active: "current" });
   // Get map details
   const details = match.map(songResult => {
      const dbmap = maplist.maps.find(map => map.id === songResult.map);
      return {
         ...songResult,
         map: dbmap
      };
   });

   return (
      <Card>
         <CardBody className="d-flex gap-1 flex-wrap">
            {details.map(m => (
               <Card
                  key={m.map.id + m.mod}
                  className="flex-shrink-0 flex-grow-1"
                  style={{ flexBasis: "140px" }}
               >
                  <Link href={buildUrl.beatmap(m.map.id)} target="_blank" rel="noopener noreferrer">
                     <CardImg
                        src={`https://assets.ppy.sh/beatmaps/${m.map.setid}/covers/cover.jpg`}
                        alt="Cover"
                        style={{ objectFit: "cover" }}
                     />
                  </Link>
                  <CardBody>
                     <CardSubtitle>{m.score.toLocaleString()}</CardSubtitle>
                     <div>{m.map.version}</div>
                     <div className="d-flex">
                        <span>
                           {m.mod.toUpperCase()}
                           <span className="d-none d-xxl-inline"> Rating:</span>
                        </span>
                        <span className="ms-auto">{m.map.ratings[m.mod].rating.toFixed()}</span>
                     </div>
                  </CardBody>
               </Card>
            ))}
         </CardBody>
      </Card>
   );
}
