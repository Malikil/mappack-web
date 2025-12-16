import { mapsDb } from "@/app/api/db/connection";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buildUrl, GameMode, Mod } from "osu-web.js";
import Image from "next/image";
import { Card, CardBody, CardSubtitle, CardTitle } from "react-bootstrap";
import { StylesSkillsChart } from "@/components/skills/StylesSkillsChart";
import { convertTime } from "@/time";

export default async function MapProfile({ params }) {
   const stringParams = await params;
   const setid = parseInt(stringParams.setid);
   const mode = stringParams.mode as GameMode;
   if (!setid || !["osu", "fruits", "taiko", "mania"].includes(mode)) return redirect("/");

   const maps = await mapsDb[mode].find({ setid }, { sort: [["rating.rating", 1], ['stars', 1]] }).toArray();
   if (!maps || maps.length < 1) return <h1>Unknown Beatmap</h1>;

   return (
      <div className="d-flex flex-column gap-2">
         <div className="d-flex justify-content-between align-items-center px-2">
            <h1 className="text-outline">
               {maps[0].artist} - {maps[0].title}
            </h1>
            <Image alt="Mode" src={`/mode-${mode}.png`} height={48} width={48} />
         </div>
         <h4 className="px-2">Mapset by {maps[0].mapper}</h4>
         {maps.map(map => (
            <Card
               key={map._id}
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
                  <div className="d-flex flex-column align-items-start">
                     <Link
                        href={buildUrl.beatmap(map._id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-reset text-decoration-none"
                     >
                        <CardTitle>{map.version}</CardTitle>
                     </Link>
                     <table className="mt-3 mb-auto">
                        <tbody>
                           <tr>
                              <td>Stars</td>
                              <td>{map.stars.toFixed(2)}</td>
                              <td className="text-center">★</td>
                           </tr>
                           <tr>
                              <td className="pe-1">Length</td>
                              <td>{convertTime(map.length)}</td>
                              <td className="text-center">⧗</td>
                           </tr>
                           <tr>
                              <td className="pb-2">BPM</td>
                              <td className="pb-2">{map.bpm.toFixed()}</td>
                              <td className="text-center pb-2">♪</td>
                           </tr>
                           {"ar" in map && (
                              <tr>
                                 <td>AR</td>
                                 <td>{map.ar}</td>
                              </tr>
                           )}
                           {"cs" in map && (
                              <tr>
                                 <td>CS</td>
                                 <td>{map.cs}</td>
                              </tr>
                           )}
                           {"od" in map && (
                              <tr>
                                 <td>OD</td>
                                 <td>{map.od}</td>
                              </tr>
                           )}
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
                           .map((mod: Mod) => {
                              const modmult = map.mods[mod];
                              return (
                                 <Card key={mod}>
                                    <CardBody>
                                       <CardTitle>{mod}</CardTitle>
                                       <CardSubtitle>{modmult.toFixed(2)}x</CardSubtitle>
                                       <CardSubtitle>{(map.rating.rating * modmult).toFixed()}</CardSubtitle>
                                    </CardBody>
                                 </Card>
                              );
                           })}
                     </div>
                  </div>
                  <Card>
                     <CardBody>
                        <StylesSkillsChart skills={map.styles} />
                     </CardBody>
                  </Card>
               </CardBody>
            </Card>
         ))}
      </div>
   );
}
