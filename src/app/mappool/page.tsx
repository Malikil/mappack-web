import { mappacksDb, playersDb } from "../api/db/connection";
import Link from "next/link";
import { auth } from "@/auth";
import { Card, CardBody, CardImg, CardSubtitle, CardTitle, Col, Row } from "react-bootstrap";
import MapCardBody from "@/components/mappool/MapCardBody";
import interpolate from "color-interpolate";
import { buildUrl } from "osu-web.js";
import { DbBeatmap } from "@/types/database.beatmap";

const palette = interpolate(["#4fc0ff", "#7cff4f", "#f6f05c", "#ff4e6f", "#c645b8", "#6563de", "black"]);
const ACTIVE_MAPPACKS = parseInt(process.env.ACTIVE_MAPPACKS);

export default async function Mappool() {
   const session = await auth();
   const player = session && (await playersDb.findOne({ _id: session.user.id }));
   const mode = player?.gamemode || "osu";

   const pools = (await mappacksDb
      .aggregate([
         {
            $match: {
               mode,
               order: {
                  $gt: 0,
                  $lte: ACTIVE_MAPPACKS
               }
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
               mapper: { $first: "$maps.mapper" },
               maps: { $push: "$maps" },
               name: { $first: "$name" },
               download: { $first: "$download" },
               order: { $first: "$order" }
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
      order: number;
      maps: {
         setid: number;
         artist: string;
         title: string;
         mapper: string;
         versions: DbBeatmap[];
      }[];
   }[];
   console.log(pools);

   return (
      <div className="d-flex flex-column gap-1">
         {pools
            .sort((a, b) => a.order - b.order)
            .map(pool => (
               <Card key={pool._id}>
                  <CardBody>
                     <div
                        className="d-flex justify-content-between flex-wrap gap-2 align-items-end"
                        role="button"
                        data-bs-toggle="collapse"
                        data-bs-target={`#collapse${pool.order}`}
                        aria-expanded="false"
                        aria-controls={`collapse${pool.order}`}
                     >
                        <div>
                           <CardTitle as="h1">{pool._id}</CardTitle>
                           <CardSubtitle>
                              {pool.maps.reduce((p, c) => p + c.versions.length, 0)} difficulties in{" "}
                              {pool.maps.length} mapsets
                           </CardSubtitle>
                        </div>
                     </div>
                     <div className="collapse" id={`collapse${pool.order}`}>
                        <CardSubtitle className="d-flex justify-content-between mt-1">
                           <Link href={pool.download}>Download</Link>
                        </CardSubtitle>
                        <div className="d-flex flex-column gap-1 mt-2">
                           {pool.maps
                              .sort((a, b) => a.setid - b.setid)
                              .map(mapset => {
                                 mapset.versions.sort((a, b) => a.rating.rating - b.rating.rating);
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
                                                      {mapset.versions.map(bm => (
                                                         <span
                                                            key={bm._id}
                                                            className="rounded"
                                                            style={{
                                                               backgroundColor: palette(
                                                                  Math.max(
                                                                     0,
                                                                     Math.min((bm.stars - 1) / 7.75, 1)
                                                                  )
                                                               )
                                                            }}
                                                         >
                                                            &ensp;
                                                         </span>
                                                      ))}
                                                   </CardSubtitle>
                                                </div>
                                             </Col>
                                          </Row>
                                          <div className="collapse" id={`collapse${mapset.setid}`}>
                                             <div className="my-2">
                                                <CardSubtitle className="d-flex gap-3">
                                                   <Link
                                                      href={buildUrl.beatmapset(mapset.setid)}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                   >
                                                      Beatmap Listing
                                                   </Link>
                                                   <Link href={`/maps/${mode}/${mapset.setid}`}>
                                                      Mapset Stats
                                                   </Link>
                                                </CardSubtitle>
                                             </div>
                                             <div className="d-flex gap-1 flex-wrap">
                                                {mapset.versions.map(bm => (
                                                   <Card
                                                      key={bm._id}
                                                      style={{
                                                         flexBasis: "225px",
                                                         flexGrow: 1,
                                                         maxWidth: "516px"
                                                      }}
                                                   >
                                                      <CardBody className="d-flex flex-column">
                                                         <CardTitle className="d-flex gap-2">
                                                            <div className="text-break">{bm.version}</div>
                                                            <div className="ms-auto">{bm._id}</div>
                                                         </CardTitle>
                                                         <MapCardBody beatmap={bm} className="mt-auto" />
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
                     </div>
                  </CardBody>
               </Card>
            ))}
      </div>
   );
}
