"use client";

import { Team } from "@/types/database.team";
import { Button, Card, CardBody, CardSubtitle, CardTitle } from "react-bootstrap";
import { acceptInvite, rejectInvite } from "./actions";

export default function PendingTeamRow({ team }: { team: Team }) {
   return (
      <Card>
         <CardBody className="d-flex justify-content-between">
            <div className="d-flex flex-column gap-1">
               <CardTitle>{team.name}</CardTitle>
               <CardSubtitle>
                  {team.players.length} Player{team.players.length === 1 ? "" : "s"}
               </CardSubtitle>
               <CardSubtitle>
                  {team.pools.length} Pool{team.pools.length === 1 ? "" : "s"}
               </CardSubtitle>
            </div>
            <div className="d-flex flex-column gap-1">
               <Button variant="success" onClick={() => acceptInvite(team._id)}>
                  Accept
               </Button>
               <Button variant="danger" className="w-100" onClick={() => rejectInvite(team._id)}>
                  Reject
               </Button>
            </div>
         </CardBody>
      </Card>
   );
}
