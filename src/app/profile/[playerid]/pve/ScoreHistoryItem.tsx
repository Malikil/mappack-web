import { Card, CardBody, CardImg, CardSubtitle } from "react-bootstrap";
import Link from "next/link";
import { buildUrl, GameMode } from "osu-web.js";
import {
   ArrowDownRightCircle,
   ArrowUpRightCircle,
   DashCircle,
   PlusCircle
} from "react-bootstrap-icons";
import { PvEMatchHistory } from "@/types/database.player";
import { mapsDb } from "@/app/api/db/connection";

export default async function ScoreHistoryItem({ match, mode }: { match: PvEMatchHistory; mode: GameMode }) {
   const maplist = await mapsDb[mode].find({ _id: { $in: match.songs.map(map => map.map.id) } }).toArray();
   // Get map details
   const details = match.songs.map(songResult => {
      const dbmap = maplist.find(map => map._id === songResult.map.id);
      return {
         ...songResult,
         map: dbmap || { ...songResult.map, _id: songResult.map.id }
      };
   });

   return (
      <Card>
         <CardBody>
            {match.songs && (
               <div className="d-flex align-items-center gap-2 mb-3 px-1">
                  <div className="fw-bold">{match.prevRating.toFixed()}</div>
                  {match.ratingDiff > 0 ? <ArrowUpRightCircle /> : <ArrowDownRightCircle />}
                  <div className="fw-bold">{(match.prevRating + match.ratingDiff).toFixed()}</div>
                  <div className="d-flex align-items-center">
                     {match.ratingDiff > 0 ? (
                        <PlusCircle className="text-success m-1" />
                     ) : (
                        <DashCircle className="text-danger m-1" />
                     )}
                     {Math.abs(match.ratingDiff).toFixed(1)}
                  </div>
                  {!isNaN(match.mp) ? (
                     <Link
                        className="ms-auto text-decoration-none"
                        href={buildUrl.match(match.mp)}
                        target="_blank"
                        rel="noopener noreferrer"
                     >
                        MP{match.mp}
                     </Link>
                  ) : (
                     <div className="ms-auto">{match.mp}</div>
                  )}
               </div>
            )}
            <div className="d-flex gap-1 flex-wrap">
               {details.map((m, i) => (
                  <Card key={i} className="flex-shrink-0 flex-grow-1" style={{ flexBasis: "140px" }}>
                     <Link href={buildUrl.beatmap(m.map._id)} target="_blank" rel="noopener noreferrer">
                        <CardImg
                           src={`https://assets.ppy.sh/beatmaps/${m.map.setid}/covers/cover.jpg`}
                           alt="Cover"
                           style={{ objectFit: "cover" }}
                        />
                     </Link>
                     <CardBody className="d-flex flex-column">
                        <CardSubtitle>{m.score.toLocaleString()}</CardSubtitle>
                        <div>{m.map.version}</div>
                        <div className="d-flex mt-auto">
                           <span>{m.mod.toUpperCase()}</span>
                           {"ratings" in m.map && (
                              <span className="ms-auto">{m.map.ratings[m.mod].rating.toFixed()}</span>
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
