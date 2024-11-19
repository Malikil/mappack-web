import { redirect } from "next/navigation";
import CreatePool from "./components/create-pool/CreatePool";
import AdminActions from "./components/actions/AdminActions";
import { verify } from "./functions";
import { checkExpiry } from "@/auth";
import AdminNotify from "./components/admin-notify/AdminNotify";
import AddAttack from "./components/add-attack/AddAttack";

export default async function Admin() {
   const { session } = await verify();
   if (!session) redirect("/");

   return (
      <div className="d-flex gap-3 flex-wrap my-1">
         <CreatePool />
         <AdminActions />
         <AddAttack />
         {checkExpiry(session.accessToken) && <AdminNotify />}
      </div>
   );
}
