import db from "@/app/api/db/connection";
import { auth, signOut } from "@/auth";
import Link from "next/link";
import { cache } from "react";
import GamemodeButton from "./GamemodeButton";

const checkRoles = cache(async osuid => {
   const collection = db.collection("players");
   const player = await collection.findOne({ osuid });
   const roles = {
      any: false,
      admin: !!player?.admin
   };
   if (roles.admin) Object.keys(roles).forEach(k => (roles[k] = true));
   else roles.any = Object.keys(roles).some(k => roles[k]);
   return roles;
});

export default async function AvatarMenu() {
   const session = await auth();
   const roles = await checkRoles(session.user.id);
   return (
      <ul className="dropdown-menu dropdown-menu-end">
         {roles.admin && (
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
         <li>
            <a className="dropdown-item d-flex justify-content-between" href="#">
               <span>Game mode </span>
               <span>&raquo;</span>
            </a>
            <ul className="dropdown-menu dropdown-submenu">
               <li>
                  <GamemodeButton className="dropdown-item" mode="osu" text="osu!" />
               </li>
               <li>
                  <GamemodeButton className="dropdown-item" mode="fruits" text="Catch" />
               </li>
            </ul>
         </li>
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
