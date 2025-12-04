'use client';

import { DbTeam } from "@/types/database.team";
import { Card, CardBody, CardTitle } from "react-bootstrap";

export default function TeamRow({ team }: { team: DbTeam }) {
   return (
      <Card>
         <CardBody>
            <CardTitle>{team.name}</CardTitle>
         </CardBody>
      </Card>
   );
}
