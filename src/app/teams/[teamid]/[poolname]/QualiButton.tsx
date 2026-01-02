"use client";

import { GameMode, Mod } from "osu-web.js";
import { Button } from "react-bootstrap";
import { toast } from "react-toastify";

export default function QualiButton({
   mode,
   maps
}: {
   mode: GameMode;
   maps: { id: number; mods?: Mod[] }[];
}) {
   return (
      <Button
         className="text-nowrap"
         onClick={() => {
            let last = "";
            const command = `!quali ${mode} ${maps
               .map(map => {
                  const currentPool = !map.mods ? "FM" : map.mods.join("") || "NM";
                  let modChange = "";
                  if (currentPool !== last) {
                     last = currentPool;
                     modChange += `${currentPool} `;
                  }
                  return `${modChange}${map.id}`;
               })
               .join(" ")}`;
            navigator.clipboard.writeText(command);
            toast.success("Copied!");
         }}
      >
         Copy !quali
      </Button>
   );
}
