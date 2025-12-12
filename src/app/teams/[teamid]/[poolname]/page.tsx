import { teamsDb } from "@/app/api/db/connection";
import { getMaplist } from "@/helpers/server/currentPack";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { buildUrl, getModsEnum } from "osu-web.js";
import { Table } from "react-bootstrap";
import QualiButton from "./QualiButton";
import { ChevronLeft } from "react-bootstrap-icons";
import Link from "next/link";
import { scoreFromResult } from "@/helpers/rating-range";
import { combineRatingsById, predictOutcome } from "@/helpers/server/ratings";
import mathplus from "@/mathplus";
import { auth } from "@/auth";

export default async function TeamPoolPage({ params }) {
   const { teamid: teamId, poolname: poolName } = await params;
   const session = await auth();
   if (!teamId || !session?.user.id) return redirect("/teams");
   const team = await teamsDb.findOne({
      _id: ObjectId.createFromHexString(teamId),
      "players.id": session.user.id
   });
   if (!team) return redirect("/teams");
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
         <Table>
            <thead>
               <tr>
                  <td>Mod</td>
                  <td>Map</td>
                  <td>Rating</td>
                  {playerList.map(p => (
                     <td key={p.id}>{p.osuname}</td>
                  ))}
                  <td>Performance</td>
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
                  const allScores = Object.values(map.scores).flatMap(s => s);
                  const combinedSd = mathplus.stdev(target, ...allScores);
                  const { wsum, wcount } = allScores
                     .sort((a, b) => b - a)
                     .reduce(
                        (agg, score, i) => {
                           const weight = Math.sqrt(i + 1);
                           agg.wsum += score / weight;
                           agg.wcount += 1 / weight;
                           return agg;
                        },
                        { wsum: 0, wcount: 0 }
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
                           {dbmap.artist} - {dbmap.title}
                           <br />
                           {dbmap.version}
                        </td>
                        <td className="bg-transparent">{(dbmap.rating.rating * modMult).toFixed()}</td>
                        {playerList.map(p => {
                           const sum = map.scores[p.id]?.reduce((s, c) => s + c);
                           return (
                              <td key={p.id} className="bg-transparent">
                                 {(sum / map.scores[p.id]?.length).toLocaleString()}
                              </td>
                           );
                        })}
                        <td className="bg-transparent">{((wavg - target) / combinedSd).toFixed(2)}</td>
                     </tr>
                  );
               })}
            </tbody>
         </Table>
      </div>
   );
}
