import { auth, signIn, signOut } from "@/auth";
import Button from "react-bootstrap/Button";
import UserAvatar from "./UserAvatar";

export default async function SignIn() {
   const session = await auth();
   const expires = new Date(session?.expires);
   const now = new Date(Date.now());
   if (!session?.user || expires < now) {
      return (
         <form
            action={async () => {
               "use server";
               await signIn("osu");
            }}
         >
            <Button type="submit">Log in with osu!</Button>
         </form>
      );
   }
   return <UserAvatar src={session.user.image} />;
}
