"use client";

import { serverActionToast } from "@/toaster";
import { GameMode } from "osu-web.js";
import { Button } from "react-bootstrap";
import { addPool } from "./actions";

export default function CreatePoolButton({ osuid, mode }: { osuid: number; mode: GameMode }) {
   return <Button
      onClick={() => serverActionToast(addPool(osuid, mode), {pending: 'Creating pool', success: 'Pool created!'})}
   >Create Pool</Button>
}