'use client';

import { parseShortMods } from "@/helpers/mods";
import { serverActionToast } from "@/toaster";
import { DbBeatmap } from "@/types/database.beatmap";
import { GameMode, getModsEnum } from "osu-web.js";
import { Button } from "react-bootstrap";
import { toast } from "react-toastify";
import { saveToOwnPools } from "./actions";

export default function ButtonRow({
   maplist,
   mode,
   name,
   user
}: {
   maplist: { [pool: string]: DbBeatmap[] };
   mode: GameMode;
   name: string;
   user?: number;
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
      <div className="d-flex gap-2">
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
         <Button
            onClick={() => {
               if (!user) return toast.warn("Not logged in");
               serverActionToast(saveToOwnPools(user, maplist, mode, name), {
                  pending: "Creating pool",
                  success: "Saved!",
                  error: "Pool with that name already exists"
               });
            }}
         >
            Save pool
         </Button>
      </div>
   );
}