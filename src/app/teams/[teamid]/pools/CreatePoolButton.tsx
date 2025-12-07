"use client";

import { serverActionToast } from "@/toaster";
import { Button } from "react-bootstrap";
import { addPool } from "./actions";

export default function CreatePoolButton({ teamid }: { teamid: string; }) {
   return <Button
      onClick={() => serverActionToast(addPool(teamid), {pending: 'Creating pool', success: 'Pool created!'})}
   >Create Pool</Button>
}