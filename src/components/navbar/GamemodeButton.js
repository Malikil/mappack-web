"use client";

import { changeGamemode } from "@/helpers/gamemode";

export default function GamemodeButton({ mode, text, ...props }) {
   return (
      <button onClick={() => changeGamemode(mode)} {...props}>
         {text}
      </button>
   );
}
