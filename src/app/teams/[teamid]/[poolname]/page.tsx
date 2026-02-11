import { teamsDb } from "@/app/api/db/connection";
import { getMaplist } from "@/helpers/server/beatmaps";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { getModsEnum } from "osu-web.js";
import QualiButton from "./QualiButton";
import { ChevronLeft } from "react-bootstrap-icons";
import Link from "next/link";
import { combineRatingsById } from "@/helpers/server/ratings";
import { auth } from "@/auth";
import StatsTable from "./StatsTable";
import { getPlayerList } from "@/helpers/server/players";

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
         if (!b.mods) return (a.sort || 1) - (b.sort || 1);
         else return 1;
      else if (!b.mods) return -1;
      return getModsEnum(a.mods) - getModsEnum(b.mods) || (a.sort || 1) - (b.sort || 1);
   });

   const maplist = await getMaplist(
      team.mode,
      pool.maps.map(m => m.id)
   );
   const combinedPlayerRatings = await combineRatingsById(team.mode, ...playerList.map(p => p.id));
   const opponents = await getPlayerList(
      team.opponents.map(opp => ({ id: opp.id, username: opp.osuname })),
      team.mode,
      true
   );

   return (
      <div>
         <div className="d-flex justify-content-between align-items-center">
            <h1 className="d-flex gap-3">
               <Link href={`/teams/${teamId}`} className="text-reset d-flex align-items-center fs-2">
                  <ChevronLeft color="var(--bs-body-color)" size="1.5rem" />
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
            opponents={opponents.map(opp => ({
               ...opp[team.mode],
               rating: opp[team.mode].pvp
            }))}
         />
      </div>
   );
}
