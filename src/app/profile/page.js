import { auth } from "@/auth";
import { redirect } from "next/navigation";
import db from "../api/db/connection";
import { Button } from "react-bootstrap";
import { register } from "./actions";
import { revalidatePath } from "next/cache";

export default async function Profile() {
   const session = await auth();

   if (!session) return redirect("/");
   const playersCollection = db.collection("players");
   const player = await playersCollection.findOne({
      osuid: session.user.id,
      hideLeaderboard: { $exists: false }
   });

   if (!player)
      return (
         <div>
            <form
               action={async () => {
                  "use server";
                  await register(session.user.id, session.user.name);
                  revalidatePath("/profile");
               }}
            >
               <Button type="submit">Register</Button>
            </form>
         </div>
      );
   return redirect(`/profile/${session.user.id}`);
}
