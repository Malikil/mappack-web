import { Card, CardBody, CardImg, CardSubtitle } from "react-bootstrap";
import db from "../api/db/connection";
import Link from "next/link";
import { buildUrl } from "osu-web.js";
import {
   ArrowDownRightCircle,
   ArrowUpRightCircle,
   CheckCircle,
   DashCircle,
   PlusCircle,
   XCircle
} from "react-bootstrap-icons";

/**
 * @param {object} params
 * @param {import("@/types/database.player").PvPMatchHistory} params.match
 */
export default async function ScoreHistoryItem({ match }) {
   const mapsDb = db.collection("maps");
   const maplist = await mapsDb.findOne({ active: "current" });
   // Get map details
   const details = (match.songs || match).map(songResult => {
      const dbmap = maplist.maps.find(map => map.id === songResult.map.id);
      if (!dbmap) return songResult;
      dbmap.ratings.fm = { rating: (dbmap.ratings.hd.rating + dbmap.ratings.hr.rating) / 2 };
      return {
         ...songResult,
         map: dbmap
      };
   });

   return (
      <Card>
         <CardBody>
            {match.songs && (
               <div className="d-flex justify-content-between mb-3 px-1">
                  <div className="d-flex align-items-center gap-2">
                     <div className="fw-bold">{match.prevRating.toFixed()}</div>
                     {match.ratingDiff > 0 ? <ArrowUpRightCircle /> : <ArrowDownRightCircle />}
                     <div className="fw-bold">
                        {(match.prevRating + match.ratingDiff).toFixed()}
                     </div>
                     <div className="d-flex align-items-center">
                        {match.ratingDiff > 0 ? (
                           <PlusCircle className="text-success m-1" />
                        ) : (
                           <DashCircle className="text-danger m-1" />
                        )}
                        {Math.abs(match.ratingDiff).toFixed(1)}
                     </div>
                  </div>
                  <div>vs. {match.opponent}</div>
               </div>
            )}
            <div className="d-flex gap-1 flex-wrap">
               {details.map((m, i) => (
                  <Card
                     className={`flex-shrink-0 flex-grow-1 border-3 border-${
                        m.score > m.opponentScore ? "success" : "danger"
                     }`}
                     key={i}
                     style={{ flexBasis: "140px" }}
                  >
                     <Link
                        href={buildUrl.beatmap(m.map.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                     >
                        <CardImg
                           src={`https://assets.ppy.sh/beatmaps/${m.map.setid}/covers/cover.jpg`}
                           alt="Cover"
                           style={{ objectFit: "cover" }}
                        />
                     </Link>
                     <CardBody className="d-flex flex-column">
                        <CardSubtitle className="d-flex justify-content-between flex-wrap">
                           <span>{m.score.toLocaleString()}</span>
                           <span
                              className={`mx-1 text-${
                                 m.score > m.opponentScore ? "success" : "danger"
                              }`}
                           >
                              {m.score > m.opponentScore ? <CheckCircle /> : <XCircle />}
                           </span>
                           <span>{m.opponentScore.toLocaleString()}</span>
                        </CardSubtitle>
                        <div>{m.map.version}</div>
                        <div className="d-flex mt-auto">
                           <span>{m.mod.toUpperCase()}</span>
                           {m.map.ratings && (
                              <span className="ms-auto">
                                 {m.map.ratings[m.mod].rating.toFixed()}
                              </span>
                           )}
                        </div>
                     </CardBody>
                  </Card>
               ))}
            </div>
         </CardBody>
      </Card>
   );
}
