import { mapsDb } from "@/app/api/db/connection";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buildUrl, GameMode, Mod } from "osu-web.js";
import Image from "next/image";
import { Card, CardBody, CardSubtitle, CardText, CardTitle, Table } from "react-bootstrap";
import { StylesSkillsChart } from "@/components/skills/StylesSkillsChart";
import SkillCard from "@/components/skills/SkillCard";
import { convertTime } from "@/time";

export default async function MapProfile({ params }) {
   const stringParams = await params;
   const mapId = parseInt(stringParams.mapid);
   const mode = stringParams.mode as GameMode;
   if (!mapId || !["osu", "fruits", "taiko", "mania"].includes(mode)) return redirect("/");

   const map = await mapsDb[mode].findOne({ _id: mapId });
   if (!map) return <h1>Unknown Beatmap</h1>;

   return (
      <div className="d-flex flex-column gap-2">
         <div className="d-flex justify-content-between align-items-center px-2">
            <h1 className="text-outline">
               <Link
                  href={buildUrl.beatmap(map._id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-reset text-decoration-none"
               >
                  {map.artist} - {map.title}
               </Link>
            </h1>
            <Image alt="Mode" src={`/mode-${mode}.png`} height={48} width={48} />
         </div>
         <Card
            className="text-outline"
            style={{
               backgroundImage: `url(${buildUrl.beatmapsetCover(map.setid)})`,
               backgroundSize: "cover",
               backgroundPosition: "center",
               backgroundRepeat: "no-repeat",
               backgroundBlendMode: "overlay",
               backgroundColor: "color-mix(in srgb, var(--bs-body-bg) 60%, transparent)"
            }}
         >
            <CardBody className="d-flex gap-2 justify-content-between">
               <div className="d-flex flex-column">
                  <CardTitle>{map.version}</CardTitle>
                  <CardSubtitle>Mapset by {map.mapper}</CardSubtitle>
                  <table className="mt-3 mb-auto align-self-start">
                     <tbody>
                        <tr>
                           <td>Stars</td>
                           <td className="ps-1">{map.stars.toFixed(2)}</td>
                           <td className="text-center">★</td>
                        </tr>
                        <tr>
                           <td>Length</td>
                           <td className="ps-1">{convertTime(map.length)}</td>
                           <td className="text-center">⧗</td>
                        </tr>
                        <tr>
                           <td>BPM</td>
                           <td className="ps-1">{map.bpm.toFixed()}</td>
                           <td className="text-center">♪</td>
                        </tr>
                     </tbody>
                  </table>
                  <div className="d-flex flex-wrap gap-2 mt-3">
                     <Card>
                        <CardBody>
                           <CardTitle>NM</CardTitle>
                           <CardSubtitle>{map.rating.rating.toFixed()}</CardSubtitle>
                           <CardSubtitle>±{map.rating.rd.toFixed()}</CardSubtitle>
                        </CardBody>
                     </Card>
                     {Object.keys(map.mods)
                        .sort((a, b) => map.mods[a] - map.mods[b])
                        .map((mod: Mod) => (
                           <Card key={mod}>
                              <CardBody>
                                 <CardTitle>{mod}</CardTitle>
                                 <CardSubtitle>{map.mods[mod].toFixed(2)}x</CardSubtitle>
                                 <CardSubtitle>{(map.rating.rating * map.mods[mod]).toFixed()}</CardSubtitle>
                              </CardBody>
                           </Card>
                        ))}
                  </div>
               </div>
               <Card>
                  <CardBody>
                     <StylesSkillsChart skills={map.styles} />
                  </CardBody>
               </Card>
            </CardBody>
         </Card>
      </div>
   );
}
