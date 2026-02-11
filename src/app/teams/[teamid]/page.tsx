import { teamsDb } from "@/app/api/db/connection";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { Card, CardBody, CardHeader, CardText } from "react-bootstrap";
import PlayerCard from "../components/PlayerCard";
import InvitePlayer from "./InvitePlayer";
import TeamName from "./TeamName";
import PoolSetupCard from "./pools/PoolSetupCard";
import LeaveTeam from "./LeaveTeam";
import { auth } from "@/auth";
import AddOpponent from "./AddOpponent";
import OpponentCard from "./OpponentCard";

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
            <TeamName teamId={teamId} data={{ name: team.name, mode: team.mode, teamSize: team.teamSize }} />
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
         <Card className="mt-2">
            <CardHeader className="d-flex justify-content-between align-items-center">
               <span>Opponents</span>
               <AddOpponent teamId={teamId} />
            </CardHeader>
            <CardBody>
               <CardText>
                  Actual opponent scores are unknown. Targets are estimated based on map difficulty, general
                  mod performance, and learned mapping styles
               </CardText>
               <div className="d-flex flex-wrap gap-1">
                  {team.opponents.map(opp => (
                     <OpponentCard key={opp.id} teamId={teamId} player={opp} />
                  ))}
               </div>
            </CardBody>
         </Card>
      </div>
   );
}
