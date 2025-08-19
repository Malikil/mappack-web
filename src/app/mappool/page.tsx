import { mappacksDb, playersDb } from "../api/db/connection";
import Link from "next/link";
import { auth } from "@/auth";
import averageRating from "@/helpers/average-rating";
import { Card, CardBody, CardImg, CardSubtitle, CardTitle, Col, Row } from "react-bootstrap";
import MapCardBody from "@/components/mappool/MapCardBody";
import { anyWithinRange } from "@/helpers/rating-range";
import { ModRatings, Rating } from "@/types/rating";
import interpolate from "color-interpolate";
import { buildUrl } from "osu-web.js";

const palette = interpolate(["#4fc0ff", "#7cff4f", "#f6f05c", "#ff4e6f", "#c645b8", "#6563de", "black"]);

export default async function Mappool() {
   const session = await auth();
   const player = session && (await playersDb.findOne({ osuid: session.user.id }));
   const playerRating: Rating = player && (player[player.gamemode]?.pvp || player[player.gamemode]?.pve);
   const mode = player?.gamemode || "osu";

   const pools = (await mappacksDb
      .aggregate([
         {
            $match: {
               mode,
               $or: [{ active: "fresh" }, { active: "stale" }]
            }
         },
         {
            $lookup: {
               from: mode,
               localField: "maps",
               foreignField: "_id",
               as: "maps"
            }
         },
         { $unwind: "$maps" },
         {
            $group: {
               _id: "$maps.setid",
               artist: { $first: "$maps.artist" },
               title: { $first: "$maps.title" },
               maps: {
                  $push: {
                     id: "$maps._id",
                     version: "$maps.version",
                     length: "$maps.length",
                     bpm: "$maps.bpm",
                     cs: "$maps.cs",
                     ar: "$maps.ar",
                     od: "$maps.od",
                     stars: "$maps.stars",
                     ratings: "$maps.ratings"
                  }
               },
               name: { $first: "$name" },
               download: { $first: "$download" },
               order: { $first: "$active" }
            }
         },
         {
            $group: {
               _id: "$name",
               download: { $first: "$download" },
               order: { $first: "$order" },
               maps: {
                  $push: {
                     setid: "$_id",
                     artist: "$artist",
                     title: "$title",
                     versions: "$maps"
                  }
               }
            }
         }
      ])
      .toArray()) as {
      _id: string;
      download: string;
      order: "fresh" | "stale";
      maps: {
         setid: number;
         artist: string;
         title: string;
         versions: {
            id: number;
            version: string;
            length: number;
            bpm: number;
            cs: number;
            ar: number;
            od: number;
            stars: number;
            ratings: ModRatings;
         }[];
      }[];
   }[];
   console.log(pools);

   return (
      <div className="d-flex flex-column gap-1">
         {pools
            .sort((a, b) => (a.order < b.order ? -1 : 1))
            .map(pool => (
               <Card key={pool._id}>
                  <CardBody>
                     <div className="d-flex justify-content-between flex-wrap gap-2 align-items-end">
                        <div>
                           <CardTitle as="h1">{pool._id}</CardTitle>
                           <CardSubtitle className="d-flex justify-content-between">
                              <Link href={pool.download}>Download</Link>
                           </CardSubtitle>
                        </div>
                        {playerRating && (
                           <small>
                              Highlighted maps are within your individual rating range.
                              <br />
                              During matches the average rating for both players is used
                           </small>
                        )}
                     </div>
                     <div className="d-flex flex-column gap-1 mt-2">
                        {pool.maps
                           .sort((a, b) => a.setid - b.setid)
                           .map(mapset => {
                              mapset.versions.sort((a, b) => averageRating(a) - averageRating(b));
                              return (
                                 <Card key={mapset.setid}>
                                    <CardBody className="d-flex flex-column gap-2">
                                       <Row
                                          role="button"
                                          data-bs-toggle="collapse"
                                          data-bs-target={`#collapse${mapset.setid}`}
                                          aria-expanded="false"
                                          aria-controls={`collapse${mapset.setid}`}
                                       >
                                          <Col>
                                             <CardImg
                                                src={`https://assets.ppy.sh/beatmaps/${mapset.setid}/covers/cover.jpg`}
                                                alt="Cover"
                                                style={{ minHeight: "100px", objectFit: "cover" }}
                                             />
                                          </Col>
                                          <Col className="d-flex flex-column justify-content-center">
                                             <div>
                                                <CardTitle>{mapset.title}</CardTitle>
                                                <CardSubtitle>{mapset.artist}</CardSubtitle>
                                                <CardSubtitle className="d-flex gap-1 mt-1">
                                                   {mapset.versions.map(bm => {
                                                      const valid = anyWithinRange(bm.ratings, playerRating);
                                                      return (
                                                         <span
                                                            key={bm.id}
                                                            className={`rounded ${
                                                               valid ? "" : "bg-body-secondary"
                                                            }`}
                                                            style={
                                                               valid
                                                                  ? {
                                                                       backgroundColor: palette(
                                                                          Math.max(
                                                                             0,
                                                                             Math.min(
                                                                                (bm.stars - 1) / 7.75,
                                                                                1
                                                                             )
                                                                          )
                                                                       )
                                                                    }
                                                                  : undefined
                                                            }
                                                         >
                                                            &ensp;
                                                         </span>
                                                      );
                                                   })}
                                                </CardSubtitle>
                                             </div>
                                          </Col>
                                       </Row>
                                       <div className="collapse" id={`collapse${mapset.setid}`}>
                                          <div className="my-2">
                                             <CardSubtitle>
                                                <Link
                                                   href={buildUrl.beatmapset(mapset.setid)}
                                                   target="_blank"
                                                   rel="noopener noreferrer"
                                                >
                                                   Beatmap Listing
                                                </Link>
                                             </CardSubtitle>
                                          </div>
                                          <div className="d-flex gap-1 flex-wrap">
                                             {mapset.versions.map(bm => (
                                                <Card
                                                   key={bm.id}
                                                   style={{
                                                      flexBasis: "225px",
                                                      flexGrow: 1,
                                                      maxWidth: "516px"
                                                   }}
                                                >
                                                   <CardBody className="d-flex flex-column">
                                                      <CardTitle className="d-flex gap-2">
                                                         <div className="text-break">{bm.version}</div>
                                                         <div className="ms-auto">{bm.id}</div>
                                                      </CardTitle>
                                                      <MapCardBody
                                                         beatmap={{ setid: mapset.setid, _id: bm.id, ...bm }}
                                                         rating={playerRating}
                                                         className="mt-auto"
                                                      />
                                                   </CardBody>
                                                </Card>
                                             ))}
                                          </div>
                                       </div>
                                    </CardBody>
                                 </Card>
                              );
                           })}
                     </div>
                  </CardBody>
               </Card>
            ))}
      </div>
   );
}
