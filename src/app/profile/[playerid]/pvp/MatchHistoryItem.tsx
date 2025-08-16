import { Card, CardBody, CardImg, CardSubtitle } from "react-bootstrap";
import Link from "next/link";
import { buildUrl, GameMode } from "osu-web.js";
import {
   ArrowDownRightCircle,
   ArrowUpRightCircle,
   CheckCircle,
   DashCircle,
   PlusCircle,
   XCircle
} from "react-bootstrap-icons";
import { mapsDb } from "@/app/api/db/connection";
import { PvPMatchHistory } from "@/types/database.player";
import { DbBeatmap } from "@/types/database.beatmap";

export default async function MatchHistoryItem({ match, mode }: { match: PvPMatchHistory; mode: GameMode }) {
   const maplist: DbBeatmap[] = await mapsDb[mode]
      .find({ _id: { $in: match.songs.map(map => map.map.id) } })
      .toArray();
   // Get map details
   const details = match.songs.map(songResult => {
      const dbmap = maplist.find(map => map._id === songResult.map.id);
      const fmIncluded = dbmap && {
         ...dbmap,
         ratings: {
            ...dbmap.ratings,
            fm: { rating: (dbmap.ratings.hd?.rating + dbmap.ratings.hr?.rating) / 2 }
         }
      };
      return {
         ...songResult,
         map: fmIncluded || { ...songResult.map, _id: songResult.map.id }
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
                     <div className="fw-bold">{(match.prevRating + match.ratingDiff).toFixed()}</div>
                     <div className="d-flex align-items-center">
                        {match.ratingDiff > 0 ? (
                           <PlusCircle className="text-success m-1" />
                        ) : (
                           <DashCircle className="text-danger m-1" />
                        )}
                        {Math.abs(match.ratingDiff).toFixed(1)}
                     </div>
                  </div>
                  <div>
                     vs.{" "}
                     <Link href={`/profile/${match.opponent.id}`} className="text-decoration-none">
                        {match.opponent.name}
                     </Link>{" "}
                     ({match.opponent.rating?.toFixed(0)})
                     <Link
                        className="ms-2 text-decoration-none"
                        href={buildUrl.match(match.mp)}
                        target="_blank"
                        rel="noopener noreferrer"
                     >
                        MP{match.mp}
                     </Link>
                  </div>
               </div>
            )}
            <div className="d-flex gap-1 flex-wrap">
               {details.map((m, i) => (
                  <Card
                     className={`flex-shrink-0 flex-grow-1 border-3 ${
                        i >= (match.warmups || 0) &&
                        `border-${m.score > m.opponentScore ? "success" : "danger"}`
                     }`}
                     key={i}
                     style={{ flexBasis: "140px" }}
                  >
                     <Link href={buildUrl.beatmap(m.map._id)} target="_blank" rel="noopener noreferrer">
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
                              className={`mx-1 ${
                                 i >= (match.warmups || 0) &&
                                 `text-${m.score > m.opponentScore ? "success" : "danger"}`
                              }`}
                           >
                              {i < (match.warmups || 0) ? (
                                 <DashCircle />
                              ) : m.score > m.opponentScore ? (
                                 <CheckCircle />
                              ) : (
                                 <XCircle />
                              )}
                           </span>
                           <span>{m.opponentScore.toLocaleString()}</span>
                        </CardSubtitle>
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
