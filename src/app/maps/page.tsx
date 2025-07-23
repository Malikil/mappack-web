import { mapsDb } from "../api/db/connection";
import Link from "next/link";
import averageRating from "@/helpers/average-rating";
import { Card, CardBody, CardImg, CardSubtitle, CardTitle, Col, Row, Table } from "react-bootstrap";
import interpolate from "color-interpolate";
import { buildUrl, GameMode } from "osu-web.js";
import { DbBeatmap } from "@/types/database.beatmap";
import { StarFill } from "react-bootstrap-icons";
import Image from "next/image";

const palette = interpolate(["#4fc0ff", "#7cff4f", "#f6f05c", "#ff4e6f", "#c645b8", "#6563de", "black"]);

export default async function Mappool() {
   const maps = (await mapsDb
      .aggregate([
         {
            $group: {
               _id: { setid: "$setid", mode: "$mode" },
               artist: { $first: "$artist" },
               title: { $first: "$title" },
               maps: {
                  $push: "$$ROOT"
               }
            }
         },
         { $sort: { _id: -1 } }
      ])
      .toArray()) as {
      _id: { setid: number; mode: GameMode };
      artist: string;
      title: string;
      maps: DbBeatmap[];
   }[];
   console.log(maps.length);

   return (
      <div className="d-flex gap-1 flex-wrap">
         {maps.map(mapset => (
            <Card
               key={`${mapset._id.mode}${mapset._id.setid}`}
               style={{
                  flexBasis: "200px",
                  flexShrink: 0,
                  flexGrow: 1,
                  maxWidth: "516px"
               }}
            >
               <CardBody className="d-flex flex-wrap">
                  <div
                     className="d-flex flex-column gap-1"
                     role="button"
                     data-bs-toggle="collapse"
                     data-bs-target={`#collapse${mapset._id.mode}${mapset._id.setid}`}
                     aria-expanded="false"
                     aria-controls={`collapse${mapset._id.mode}${mapset._id.setid}`}
                  >
                     <CardImg
                        src={`https://assets.ppy.sh/beatmaps/${mapset._id.setid}/covers/cover.jpg`}
                        alt="Cover"
                        style={{ minHeight: "100px", objectFit: "cover" }}
                     />
                     <CardTitle className="mt-1 mb-0">{mapset.title}</CardTitle>
                     <CardSubtitle>{mapset.artist}</CardSubtitle>
                     <div className="d-flex gap-1 mt-auto align-items-center">
                        {mapset.maps.sort((a, b) => averageRating(a) - averageRating(b)).map(bm => (
                           <span
                              key={bm.id}
                              className="rounded"
                              style={{
                                 backgroundColor: palette(Math.max(0, Math.min((bm.stars - 1) / 7.75, 1)))
                              }}
                           >
                              &ensp;
                           </span>
                        ))}
                        <Image
                           className="ms-auto"
                           alt="Mode Icon"
                           src={`/mode-${mapset._id.mode}.png`}
                           height={24}
                           width={24}
                        />
                     </div>
                  </div>
                  <div className="collapse" id={`collapse${mapset._id.mode}${mapset._id.setid}`}>
                     <CardSubtitle className="mt-1">
                        <Link
                           href={buildUrl.beatmapset(mapset._id.setid)}
                           target="_blank"
                           rel="noopener noreferrer"
                        >
                           Beatmap Listing
                        </Link>
                     </CardSubtitle>
                     <Table className="table-sm mb-0">
                        <tbody>
                           {mapset.maps
                              .sort((a, b) => averageRating(a) - averageRating(b))
                              .map(bmap => (
                                 <tr key={bmap.id}>
                                    <td>{bmap.version}</td>
                                    <td>
                                       <span>{bmap.stars.toFixed(2)}</span>
                                       <StarFill height={10} className="mb-1" />
                                    </td>
                                    <td>{bmap.ratings.nm.rating.toFixed()}</td>
                                 </tr>
                              ))}
                        </tbody>
                     </Table>
                  </div>
               </CardBody>
            </Card>
         ))}
      </div>
   );
}
