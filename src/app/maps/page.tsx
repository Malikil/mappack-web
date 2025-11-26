import { mapsDb, playersDb } from "../api/db/connection";
import { Card, CardBody, CardSubtitle, CardTitle } from "react-bootstrap";
import { buildUrl, GameMode, getModsEnum, Mod } from "osu-web.js";
import { DbBeatmap } from "@/types/database.beatmap";
import { ModPool as ModPoolType, Rating } from "@/types/rating";
import { auth } from "@/auth";
import { predictOutcome } from "@/helpers/server/ratings";
import { scoreFromResult } from "@/helpers/rating-range";
import mathplus from "@/mathplus";
import ButtonRow from "./ButtonRow";
import { getMaplist } from "@/helpers/server/currentPack";
import { parseShortMods } from "@/helpers/mods";

export default async function Mappool({ searchParams }) {
   const session = await auth();
   const player = session && (await playersDb.findOne({ osuid: session.user.id }));
   const playerRating: Rating = player && player[player.gamemode].pve;

   const stringParams: { [key: string]: string } = await searchParams;
   const { m: modeArg, p: poolName, ...pools } = stringParams;
   const mode = ["osu", "fruits", "mania", "taiko"].includes(modeArg)
      ? (modeArg as GameMode)
      : player?.gamemode || "osu";
   const parsedPools = Object.fromEntries(
      Object.keys(pools).map(k => [k, (pools[k].split(",") || []).map(v => parseInt(v))])
   );

   // Get the player's scores on each map, if a preset pool has been provided
   const presetPool = player && player[mode].pools.find(pool => pool.name === poolName);

   const mapIds = Object.keys(parsedPools).flatMap(k => parsedPools[k]);
   const maps = await getMaplist(mode, mapIds);
   const maplist: {
      [pool: string]: (DbBeatmap & { scores: number[] })[];
   } = Object.fromEntries(
      Object.keys(parsedPools)
         .map(modpool =>
            parsedPools[modpool]
               ? [
                    modpool,
                    parsedPools[modpool]
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
         )
         .filter(v => v)
   );
   const sortedPools = Object.keys(maplist).sort((a, b) => {
      const alist = parseShortMods(a);
      const blist = parseShortMods(b);
      if (!alist)
         if (!blist) return 0;
         else return 1;
      else if (!blist) return -1;
      return getModsEnum(alist) - getModsEnum(blist);
   });

   return (
      <div>
         <ButtonRow maplist={maplist} mode={mode} />
         {sortedPools.map(mods => {
            const modMaps = maplist[mods];
            const modsArr = parseShortMods(mods);
            return (
               <div key={mods} className="d-flex flex-column gap-1 mb-2">
                  <h2>{mods.toUpperCase()}</h2>
                  {modMaps.map((beatmap: DbBeatmap & { scores: number[] }) => {
                     const modMult = modsArr?.reduce((mult, mod) => mult * (beatmap.mods[mod] || 1), 1) || 1;
                     const { sum, weightedSum, weightedCount } = beatmap.scores
                        .sort((a, b) => b - a)
                        .reduce(
                           (agg, score, i) => {
                              const weight = Math.sqrt(i + 1);
                              agg.sum += score;
                              agg.weightedSum += score / weight;
                              agg.weightedCount += 1 / weight;
                              return agg;
                           },
                           { sum: 0, weightedSum: 0, weightedCount: 0 }
                        );
                     const target =
                        scoreFromResult(predictOutcome(playerRating, beatmap.rating), mode, false) / modMult;
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
                              <div className="d-flex gap-3">
                                 <div>
                                    <CardTitle>
                                       {beatmap.title} [{beatmap.version}]
                                    </CardTitle>
                                    <CardSubtitle>{beatmap.artist}</CardSubtitle>
                                 </div>
                                 <div className="ms-auto">
                                    <div className="d-flex gap-3 flex-wrap flex-lg-nowrap">
                                       <div>
                                          <div>Rating</div>
                                          <div>{(beatmap.rating.rating * modMult).toFixed()}</div>
                                       </div>
                                       <div>
                                          <div>Target</div>
                                          <div>{target.toFixed()}</div>
                                       </div>
                                       <div>
                                          <div>Deviation</div>
                                          <div>{beatmap.rating.rd.toFixed()}</div>
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
                                                <div className="text-nowrap">Weighted Avg</div>
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
                                 </div>
                              </div>
                           </CardBody>
                        </Card>
                     );
                  })}
               </div>
            );
         })}
      </div>
   );
}
