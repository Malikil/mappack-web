import { redirect } from "next/navigation";
import AdminActions from "./components/actions/AdminActions";
import { verify } from "./functions";
import { checkExpiry } from "@/auth";
import AdminNotify from "./components/admin-notify/AdminNotify";
import DifficultyChart from "./components/difficulty-chart/DifficultyChart";
import AddAttack from "./components/add-attack/AddAttack";
import CustomPool from "./components/custom-pool/CustomPool";

export default async function Admin() {
   const { session } = await verify();
   if (!session) redirect("/");

   return (
      <div>
         <div className="d-flex gap-3 flex-wrap mb-2">
            <AdminActions />
            <AddAttack />
            <CustomPool />
         </div>
         <DifficultyChart />
         {checkExpiry(session.accessToken) && <AdminNotify />}
      </div>
   );
}
