import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { playersDb } from "../api/db/connection";
import { Button } from "react-bootstrap";
import { revalidatePath } from "next/cache";
import { register } from "../api/db/register/functions";

export default async function Profile() {
   const session = await auth();

   if (!session) return redirect("/");
   const player = await playersDb.findOne({
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
