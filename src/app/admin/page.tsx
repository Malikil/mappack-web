import { redirect } from "next/navigation";
import AdminActions from "./components/actions/AdminActions";
import { verify } from "./functions";
// import { checkExpiry } from "@/auth";
// import AdminNotify from "./components/admin-notify/AdminNotify";
import DifficultyChart from "./components/difficulty-chart/DifficultyChart";
import AddAttack from "./components/add-attack/AddAttack";
//import TournamentSubmit from "./components/bulk-add/TournamentSubmit";

export default async function Admin() {
   const { session } = await verify();
   if (!session) redirect("/");

   return (
      <div className="d-flex flex-column gap-2">
         <div className="d-flex gap-3 flex-wrap">
            <AdminActions />
            <AddAttack />
            {/* <TournamentSubmit /> */}
         </div>
         <DifficultyChart chartVersion="scaling" />
         <DifficultyChart chartVersion="recent" />
         {/* {checkExpiry(session.accessToken) && <AdminNotify />} */}
      </div>
   );
}
