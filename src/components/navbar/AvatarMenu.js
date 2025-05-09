import db from "@/app/api/db/connection";
import { auth, signOut } from "@/auth";
import Link from "next/link";
import GamemodeButton from "./GamemodeButton";
import Image from "next/image";

export default async function AvatarMenu() {
   const session = await auth();
   const player = await db.collection("players").findOne({ osuid: session.user.id });
   return (
      <ul className="dropdown-menu dropdown-menu-end">
         {player?.admin && (
            <li>
               <Link className="dropdown-item" href="/admin">
                  Admin
               </Link>
            </li>
         )}
         <li>
            <Link className="dropdown-item" href="/profile">
               Profile
            </Link>
         </li>
         {player && (
            <li>
               <a className="dropdown-item d-flex justify-content-between" href="#">
                  <span>Game mode </span>
                  <span>&raquo;</span>
               </a>
               <ul className="dropdown-menu dropdown-submenu">
                  <li className="d-flex align-items-center">
                     <GamemodeButton className="dropdown-item" mode="osu" text="osu!" />
                     {player.gamemode === "osu" && (
                        <Image
                           src="/mode-osu.png"
                           alt="osu active"
                           height={24}
                           width={24}
                           className="me-2"
                        />
                     )}
                  </li>
                  <li className="d-flex align-items-center">
                     <GamemodeButton className="dropdown-item" mode="fruits" text="Catch" />
                     {player.gamemode === "fruits" && (
                        <Image
                           src="/mode-fruits.png"
                           alt="ctb active"
                           height={24}
                           width={24}
                           className="me-2"
                        />
                     )}
                  </li>
               </ul>
            </li>
         )}
         <li>
            <hr className="dropdown-divider" />
         </li>
         <li>
            <form
               action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
               }}
            >
               <button className="dropdown-item" type="submit">
                  Logout
               </button>
            </form>
         </li>
      </ul>
   );
}
