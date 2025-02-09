"use client";

import useGamemode from "@/hooks/useGamemode";
import Image from "next/image";

export default function ModeToggle() {
   const { gamemode, setGamemode } = useGamemode();

   return (
      <div>
         <a
            className="nav-link"
            href="#"
            role="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
         >
            {
               <Image
                  src={`/mode-${gamemode}.png`}
                  alt={`${gamemode} icon`}
                  width={32}
                  height={32}
               />
            }
         </a>
         <ul className="dropdown-menu">
            <li>
               <a className="dropdown-item" href="#" onClick={() => setGamemode("osu")}>
                  osu!
               </a>
            </li>
            <li>
               <a className="dropdown-item" href="#" onClick={() => setGamemode("fruits")}>
                  Catch the Beat
               </a>
            </li>
         </ul>
      </div>
   );
}
