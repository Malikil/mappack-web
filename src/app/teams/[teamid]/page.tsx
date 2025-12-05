import { teamsDb } from "@/app/api/db/connection";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { Card, CardBody, CardHeader } from "react-bootstrap";
import PlayerCard from "../components/PlayerCard";
import InvitePlayer from "./InvitePlayer";
import TeamName from "./TeamName";

export default async function TeamPage({ params }) {
   const teamId = (await params).teamid;
   const team = await teamsDb.findOne({ _id: ObjectId.createFromHexString(teamId) });
   if (!team) return redirect("/teams");

   return (
      <div>
         <h1><TeamName teamId={teamId} name={team.name} /></h1>
         <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
               <span>Players</span>
               <InvitePlayer teamId={teamId} />
            </CardHeader>
            <CardBody className="d-flex flex-wrap gap-1">
               {team.players.map(p => (
                  <PlayerCard key={p.id} player={p} />
               ))}
            </CardBody>
         </Card>
      </div>
   );
}
