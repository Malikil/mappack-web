import db from "../api/db/connection";
import Link from "next/link";
import { auth } from "@/auth";
import averageRating from "@/helpers/average-rating";
import { Card, CardBody, CardImg, CardSubtitle, CardTitle, Col, Row } from "react-bootstrap";
import MapCardBody from "@/components/mappool/MapCardBody";
import { anyWithinRange } from "@/helpers/rating-range";

export default async function Mappool() {
   const session = await auth();
   const mapsCollection = db.collection("maps");
   const pools = await mapsCollection
      .aggregate([
         { $match: { $or: [{ active: "fresh" }, { active: "stale" }] } },
         { $unwind: "$maps" },
         {
            $group: {
               _id: "$maps.setid",
               artist: { $first: "$maps.artist" },
               title: { $first: "$maps.title" },
               maps: {
                  $push: {
                     id: "$maps.id",
                     version: "$maps.version",
                     length: "$maps.length",
                     bpm: "$maps.bpm",
                     cs: "$maps.cs",
                     ar: "$maps.ar",
                     stars: "$maps.stars",
                     ratings: "$maps.ratings"
                  }
               },
               name: { $first: "$name" },
               download: { $first: "$download" }
            }
         },
         {
            $group: {
               _id: "$name",
               download: { $first: "$download" },
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
      .toArray();
   console.log(pools);
   let playerRating = null;
   if (session) {
      const player = await db.collection("players").findOne({ osuid: session.user.id });
      if (player) playerRating = player.pvp;
   }

   return (
      <div className="d-flex flex-column gap-1">
         {pools
            .sort((a, b) => (a._id < b._id ? 1 : a._id > b._id ? -1 : 0))
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
                                                      const valid = anyWithinRange(
                                                         bm.ratings,
                                                         playerRating
                                                      );
                                                      return (
                                                         <span
                                                            key={bm.id}
                                                            className={`${
                                                               valid
                                                                  ? "bg-success"
                                                                  : "bg-body-secondary"
                                                            } rounded`}
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
                                                         <div className="text-break">
                                                            {bm.version}
                                                         </div>
                                                         <div className="ms-auto">{bm.id}</div>
                                                      </CardTitle>
                                                      <MapCardBody
                                                         beatmap={{ setid: mapset.setid, ...bm }}
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
