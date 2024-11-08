import { Card, CardBody, CardImg, CardSubtitle } from "react-bootstrap";
import db from "../api/db/connection";
import Link from "next/link";
import { buildUrl } from "osu-web.js";
import { CheckCircle, XCircle } from "react-bootstrap-icons";

export default async function ScoreHistoryItem({ match }) {
   const mapsDb = db.collection("maps");
   const maplist = await mapsDb.findOne({ active: "current" });
   // Get map details
   const details = match.map(songResult => {
      const dbmap = maplist.maps.find(map => map.id === songResult.map);
      dbmap.ratings.fm = { rating: (dbmap.ratings.hd.rating + dbmap.ratings.hr.rating) / 2 };
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
                  className={`flex-shrink-0 flex-grow-1 border-3 border-${
                     m.score > m.opponentScore ? "success" : "danger"
                  }`}
                  key={m.map.id + m.mod}
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
                     <CardSubtitle className="d-flex justify-content-between">
                        <span>{m.score.toLocaleString()}</span>
                        <span
                           className={`text-${m.score > m.opponentScore ? "success" : "danger"}`}
                        >
                           {m.score > m.opponentScore ? <CheckCircle /> : <XCircle />}
                        </span>
                        <span>{m.opponentScore.toLocaleString()}</span>
                     </CardSubtitle>
                     <div>{m.map.version}</div>
                     <div className="d-flex justify-content-between">
                        <span>
                           {m.mod.toUpperCase()}
                           <span className="d-none d-xxl-inline"> Rating:</span>
                        </span>
                        <span>{m.map.ratings[m.mod].rating.toFixed()}</span>
                     </div>
                  </CardBody>
               </Card>
            ))}
         </CardBody>
      </Card>
   );
}
