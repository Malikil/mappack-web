import { teamsDb } from "@/app/api/db/connection";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { Card, CardBody, CardHeader } from "react-bootstrap";
import PlayerCard from "../components/PlayerCard";
import InvitePlayer from "./InvitePlayer";
import TeamName from "./TeamName";
import PoolSetupCard from "./pools/PoolSetupCard";
import LeaveTeam from "./LeaveTeam";
import { auth } from "@/auth";

export default async function TeamPage({ params }) {
   const teamId = (await params).teamid;
   const session = await auth();
   if (!teamId || !session?.user.id) return redirect("/teams");
   const team = await teamsDb.findOne({
      _id: ObjectId.createFromHexString(teamId),
      "players.id": session.user.id
   });
   if (!team) return redirect("/teams");

   return (
      <div>
         <h1>
            <TeamName teamId={teamId} name={team.name} />
         </h1>
         <Card className="mb-2">
            <CardHeader className="d-flex justify-content-between align-items-center">
               <span>Players</span>
               <div className="d-flex gap-2">
                  <InvitePlayer teamId={teamId} />
                  <LeaveTeam teamId={teamId} />
               </div>
            </CardHeader>
            <CardBody className="d-flex flex-wrap gap-1">
               {team.players.map(p => (
                  <PlayerCard key={p.id} player={p} />
               ))}
            </CardBody>
         </Card>
         <PoolSetupCard teamid={teamId} data={team.pools} mode={team.mode} />
      </div>
   );
}
