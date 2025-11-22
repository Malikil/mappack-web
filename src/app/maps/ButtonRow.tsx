'use client';

import { DbBeatmap } from "@/types/database.beatmap";
import { ModPool } from "@/types/rating";
import { GameMode } from "osu-web.js";
import { Button } from "react-bootstrap";
import { toast } from "react-toastify";

export default function ButtonRow({ maplist, mode }: { maplist: Partial<Record<ModPool, DbBeatmap[]>>, mode: GameMode }) {
   return <div>
      <Button onClick={() => {
         const command = `!quali ${mode} ${
            Object.entries(maplist).map(
               ([mod, mapArr]) => `${mod} ${mapArr.map(m => m._id).join(' ')}`
            ).join(' ')
         }`;
         navigator.clipboard.writeText(command);
         toast('Copied!');
      }}>Copy !quali command</Button>
   </div>
}