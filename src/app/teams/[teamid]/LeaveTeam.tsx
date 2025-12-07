"use client";

import { Button } from "react-bootstrap";
import { leaveTeam } from "./actions";

export default function LeaveTeam({ teamId }: { teamId: string }) {
   return <Button variant="danger" onClick={() => leaveTeam(teamId)}>Leave Team</Button>;
}
