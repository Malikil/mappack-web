import { Card, CardBody, CardImg, CardSubtitle } from "react-bootstrap";
import Link from "next/link";
import { buildUrl, GameMode, getEnumMods } from "osu-web.js";
import { ArrowDownRightCircle, ArrowUpRightCircle, DashCircle, PlusCircle } from "react-bootstrap-icons";
import { MatchHistory } from "@/types/database.player";
import { mapsDb } from "@/app/api/db/connection";
import PvEMap from "@/components/maps/PvEMap";
import { effectiveRating } from "@/helpers/rating-range";

export default async function ScoreHistoryItem({ match, mode }: { match: MatchHistory; mode: GameMode }) {
   const maplist = await mapsDb[mode].find({ _id: { $in: match.songs.map(map => map.map.id) } }).toArray();

   // Get map details
   const details = match.songs.map(songResult => {
      const dbmap = maplist.find(map => map._id === songResult.map.id);
      return {
         ...songResult,
         map: dbmap,
         mapSimple: songResult.map
      };
   });

   return (
      <Card>
         <CardBody>
            <div className="d-flex align-items-center gap-2 px-1">
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
               <div
                  role="button"
                  data-bs-toggle="collapse"
                  data-bs-target={`#collapse${match.mp}`}
                  aria-expanded="false"
                  aria-controls={`collapse${match.mp}`}
               >
                  <small className="text-decoration-underline">Details</small>
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
            <div className="collapse" id={`collapse${match.mp}`}>
               <div className="d-flex gap-1 flex-wrap mt-3">
                  {details.map((m, i) => {
                     const mods = getEnumMods(m.mods || 0);
                     const modsMult = mods.reduce((mult, mod) => mult * (m.map.mods[mod] || 1), 1);
                     const map = m.map || { ...m.mapSimple, _id: m.mapSimple.id };
                     return (
                        <PvEMap
                           key={i}
                           id={map._id}
                           mods={mods}
                           mode={mode}
                           score={m.score}
                           setid={map.setid}
                           version={map.version}
                           rating={
                              m.map &&
                              (modsMult !== 1
                                 ? effectiveRating(m.map.rating, mode, modsMult)
                                 : m.map.rating.rating)
                           }
                        />
                     );
                  })}
               </div>
            </div>
         </CardBody>
      </Card>
   );
}
