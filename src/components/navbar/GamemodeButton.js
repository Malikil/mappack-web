"use client";

import { changeGamemode } from "@/helpers/gamemode";
import { useRouter } from "next/navigation";

export default function GamemodeButton({ mode, text, ...props }) {
   const router = useRouter();
   return (
      <button onClick={() => changeGamemode(mode).then(() => router.refresh())} {...props}>
         {text}
      </button>
   );
}
