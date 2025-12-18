import { teamsDb } from "@/app/api/db/connection";
import { getMaplist } from "@/helpers/server/currentPack";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { getModsEnum } from "osu-web.js";
import QualiButton from "./QualiButton";
import { ChevronLeft } from "react-bootstrap-icons";
import Link from "next/link";
import { combineRatingsById } from "@/helpers/server/ratings";
import { auth } from "@/auth";
import StatsTable from "./StatsTable";

export default async function TeamPoolPage({ params }) {
   const { teamid: teamId, poolname } = await params;
   const session = await auth();
   if (!teamId || !session?.user.id) return redirect("/teams");
   const team = await teamsDb.findOne({
      _id: ObjectId.createFromHexString(teamId),
      "players.id": session.user.id
   });
   if (!team) return redirect("/teams");
   const poolName = decodeURIComponent(poolname);
   const pool = team.pools.find(pool => pool.name === poolName);
   if (!pool) return redirect(`/teams/${teamId}`);
   const playerList = team.players.filter(p => !p.pending);
   pool.maps.sort((a, b) => {
      if (!a.mods)
         if (!b.mods) return 0;
         else return 1;
      else if (!b.mods) return -1;
      return getModsEnum(a.mods) - getModsEnum(b.mods);
   });

   const maplist = await getMaplist(
      team.mode,
      pool.maps.map(m => m.id)
   );
   const combinedPlayerRatings = await combineRatingsById(team.mode, ...playerList.map(p => p.id));

   return (
      <div>
         <div className="d-flex justify-content-between align-items-center">
            <h1 className="d-flex gap-3">
               <Link href={`/teams/${teamId}`} className="text-reset d-flex align-items-center fs-2">
                  <ChevronLeft />
               </Link>
               <span>
                  {team.name} - {poolName}
               </span>
            </h1>
            <QualiButton mode={team.mode} maps={pool.maps} />
         </div>
         <StatsTable
            maplist={maplist}
            mode={team.mode}
            players={playerList}
            pool={pool}
            targetRating={combinedPlayerRatings.targetRating}
            teamSize={team.teamSize}
         />
         {/* <Table>
            <thead>
               <tr>
                  <td>Mod</td>
                  <td>Map</td>
                  <td>Rating</td>
                  {playerList.map(p => (
                     <td key={p.id}>{p.osuname}</td>
                  ))}
                  <td>Perf.</td>
                  <td>Team Avg</td>
               </tr>
            </thead>
            <tbody>
               {pool.maps.map(map => {
                  const dbmap = maplist.find(dbm => dbm._id === map.id);
                  const modMult = map.mods?.reduce((mult, mod) => mult * (dbmap.mods[mod] || 1), 1) || 1;
                  const target =
                     scoreFromResult(
                        predictOutcome(combinedPlayerRatings.targetRating, dbmap.rating),
                        team.mode
                     ) / modMult;
                  const scoresWithAvg = Object.keys(map.scores)
                     .map(pid => {
                        const player = parseInt(pid);
                        const sum = map.scores[player].reduce((p, c) => p + c);
                        return {
                           player,
                           scores: map.scores[player],
                           avg: sum / map.scores[player].length
                        };
                     })
                     .filter(s => s.avg)
                     .sort((a, b) => b.avg - a.avg)
                     .slice(0, team.teamSize);
                  const allScores = scoresWithAvg.flatMap(s => s.scores);
                  const combinedSd = mathplus.stdev(target, ...allScores);
                  const { wsum, wcount } = allScores
                     .sort((a, b) => b - a)
                     .reduce(
                        (agg, score, i) => {
                           agg.sum += score;
                           const weight = Math.sqrt(i + 1);
                           agg.wsum += score / weight;
                           agg.wcount += 1 / weight;
                           return agg;
                        },
                        { sum: 0, wsum: 0, wcount: 0 }
                     );
                  const wavg = wsum / wcount;
                  return (
                     <tr
                        key={map.id}
                        className="text-outline"
                        style={{
                           backgroundImage: `url(${buildUrl.beatmapsetCover(dbmap.setid)})`,
                           backgroundSize: "cover",
                           backgroundPosition: "center",
                           backgroundRepeat: "no-repeat",
                           backgroundBlendMode: "overlay",
                           backgroundColor: "color-mix(in srgb, var(--bs-body-bg) 60%, transparent)"
                        }}
                     >
                        <td className="bg-transparent">{map.mods ? map.mods.join("") || "NM" : "FM"}</td>
                        <td className="bg-transparent">
                           <Link
                              href={`/maps/${team.mode}/${dbmap.setid}`}
                              className="text-reset text-decoration-none"
                           >
                              {dbmap.artist} - {dbmap.title}
                              <br />
                              {dbmap.version}
                           </Link>
                        </td>
                        <td className="bg-transparent">{(dbmap.rating.rating * modMult).toFixed()}</td>
                        {playerList.map(p => {
                           const sum = map.scores[p.id]?.reduce((s, c) => s + c);
                           return (
                              <td key={p.id} className="bg-transparent">
                                 {Math.round(sum / map.scores[p.id]?.length).toLocaleString()}
                              </td>
                           );
                        })}
                        <td className="bg-transparent">{((wavg - target) / combinedSd).toFixed(2)}</td>
                        <td className="bg-transparent">
                           {(
                              scoresWithAvg.reduce((p, c) => p + c.avg, 0) /
                              scoresWithAvg.length /
                              1000
                           ).toFixed()}
                           k
                        </td>
                     </tr>
                  );
               })}
            </tbody>
         </Table> */}
      </div>
   );
}
