import { mapsDb, playersDb } from "../api/db/connection";
import { Card, CardBody, CardSubtitle, CardTitle, Col, Row } from "react-bootstrap";
//import interpolate from "color-interpolate";
import { buildUrl } from "osu-web.js";
import { DbBeatmap } from "@/types/database.beatmap";
import { ModPool as ModPoolType, Rating } from "@/types/rating";
import { auth } from "@/auth";
import { predictOutcome } from "@/helpers/server/ratings";
import { scoreFromResult } from "@/helpers/rating-range";
import mathplus from "@/mathplus";
//import { PracticePool } from "@/types/database.player";

//const palette = interpolate(["#4fc0ff", "#7cff4f", "#f6f05c", "#ff4e6f", "#c645b8", "#6563de", "black"]);
const MODLIST: ModPoolType[] = ["nm", "hd", "hr", "dt", "fm"];

export default async function Mappool({ searchParams }) {
   const session = await auth();
   const player = session && (await playersDb.findOne({ osuid: session.user.id }));
   const playerRating: Rating = player && player[player.gamemode].pve;
   const mode = player?.gamemode || "osu";

   const stringParams = await searchParams;
   const parsedParams = Object.fromEntries(
      Object.keys(stringParams).map(k => [k, (stringParams[k].split(",") || []).map(v => parseInt(v))])
   ) as Partial<Record<ModPoolType, number[]>>;

   // Get the player's scores on each map, if a preset pool has been provided
   const presetPool = player && player[mode].pools.find(pool => pool.name === stringParams.p);

   const mapIds = MODLIST.flatMap(mod => parsedParams[mod] || []);
   const maps: DbBeatmap[] = await mapsDb[stringParams.m || mode].find({ _id: { $in: mapIds } }).toArray();
   const maplist: Partial<Record<ModPoolType, (DbBeatmap & { scores: number[] })[]>> = Object.fromEntries(
      MODLIST.map(mod =>
         parsedParams[mod]
            ? [
                 mod,
                 parsedParams[mod]
                    .map(m => {
                       const foundmap = maps.find(p => p._id === m) || ({} as DbBeatmap);
                       const foundScores = presetPool?.maps.find(pm => pm.id === m);
                       return {
                          ...foundmap,
                          scores: foundScores?.scores || []
                       };
                    })
                    .filter(m => m._id)
              ]
            : null
      ).filter(v => v)
   );

   return (
      <div>
         {Object.entries(maplist).map(
            ([mod, modMaps]: [ModPoolType, (DbBeatmap & { scores: number[] })[]]) => {
               return (
                  <div key={mod} className="d-flex flex-column gap-1 mb-2">
                     <h2>{mod.toUpperCase()}</h2>
                     {modMaps.map((beatmap: DbBeatmap & { scores: number[] }) => {
                        const ratingMod = mod === "fm" ? "nm" : mod;
                        const mapRating = beatmap.ratings[ratingMod];
                        const { sum, weightedSum, weightedCount } = beatmap.scores
                           .sort((a, b) => b - a)
                           .reduce(
                              (agg, score, i) => {
                                 agg.sum += score;
                                 agg.weightedSum += score / (i + 1);
                                 agg.weightedCount += 1 / (i + 1);
                                 return agg;
                              },
                              { sum: 0, weightedSum: 0, weightedCount: 0 }
                           );
                        const target = scoreFromResult(
                           predictOutcome(playerRating, mapRating),
                           stringParams.m || mode,
                           false
                        );
                        const combinedSd = mathplus.stdev(target, ...beatmap.scores);
                        const avg = sum / beatmap.scores.length;
                        const wavg = weightedSum / weightedCount;
                        return (
                           <Card
                              key={beatmap._id}
                              style={{
                                 backgroundImage: `url(${buildUrl.beatmapsetCover(beatmap.setid)})`,
                                 backgroundSize: "cover",
                                 backgroundPosition: "center",
                                 backgroundRepeat: "no-repeat",
                                 backgroundBlendMode: "overlay",
                                 backgroundColor: "color-mix(in srgb, var(--bs-body-bg) 60%, transparent)"
                              }}
                           >
                              <CardBody className="text-outline">
                                 <Row>
                                    <Col>
                                       <CardTitle>
                                          {beatmap.title} [{beatmap.version}]
                                       </CardTitle>
                                       <CardSubtitle>{beatmap.artist}</CardSubtitle>
                                    </Col>
                                    <Col>
                                       <div className="d-flex gap-3">
                                          <div>
                                             <div>Rating</div>
                                             <div>{mapRating.rating.toFixed()}</div>
                                          </div>
                                          <div>
                                             <div>Target</div>
                                             <div>{target.toFixed()}</div>
                                          </div>
                                          <div>
                                             <div>Deviation</div>
                                             <div>{mapRating.rd.toFixed()}</div>
                                          </div>
                                          {presetPool && (
                                             <>
                                                <div>
                                                   <div>Plays</div>
                                                   <div>{beatmap.scores.length}</div>
                                                </div>
                                                <div>
                                                   <div>Average</div>
                                                   <div>{avg.toFixed()}</div>
                                                </div>
                                                <div>
                                                   <div>Weighted Avg</div>
                                                   <div>{wavg.toFixed()}</div>
                                                </div>
                                                <div>
                                                   <div>Performance</div>
                                                   <div>
                                                      {((avg - target) / combinedSd).toFixed(2)} |{" "}
                                                      {((wavg - target) / combinedSd).toFixed(2)}
                                                   </div>
                                                </div>
                                             </>
                                          )}
                                       </div>
                                    </Col>
                                 </Row>
                              </CardBody>
                           </Card>
                        );
                     })}
                  </div>
               );
            }
         )}
      </div>
   );
}
