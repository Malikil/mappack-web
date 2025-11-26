'use client';

import { parseShortMods } from "@/helpers/mods";
import { DbBeatmap } from "@/types/database.beatmap";
import { GameMode, getModsEnum } from "osu-web.js";
import { Button } from "react-bootstrap";
import { toast } from "react-toastify";

export default function ButtonRow({
   maplist,
   mode
}: {
   maplist: { [pool: string]: DbBeatmap[] };
   mode: GameMode;
}) {
   const poolsSorted = Object.keys(maplist).sort((a, b) => {
      const alist = parseShortMods(a);
      const blist = parseShortMods(b);
      if (!alist)
         if (!blist) return 0;
         else return 1;
      else if (!blist) return -1;
      return getModsEnum(alist) - getModsEnum(blist);
   });
   return (
      <div>
         <Button
            onClick={() => {
               const command = `!quali ${mode} ${poolsSorted
                  .map(mod => `${mod} ${maplist[mod].map(m => m._id).join(" ")}`)
                  .join(" ")}`;
               navigator.clipboard.writeText(command);
               toast.success("Copied!");
            }}
         >
            Copy !quali command
         </Button>
      </div>
   );
}