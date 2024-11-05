import db from "@/app/api/db/connection";
import { auth, signOut } from "@/auth";
import Link from "next/link";
import { cache } from "react";

const checkRoles = cache(async osuid => {
   const collection = db.collection("players");
   const player = await collection.findOne({ osuid });
   const roles = {
      any: false,
      admin: !!player?.admin,
      approver: !!player?.approver,
      referee: !!player?.referee
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
         {roles.approver && (
            <li>
               <Link className="dropdown-item" href="/admin/approver">
                  Approving
               </Link>
            </li>
         )}
         {roles.referee && (
            <li>
               <Link className="dropdown-item" href="/referee">
                  Referee
               </Link>
            </li>
         )}
         {roles.any && (
            <li>
               <hr className="dropdown-divider" />
            </li>
         )}
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
