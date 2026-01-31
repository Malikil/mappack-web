import { ExclamationCircle } from "react-bootstrap-icons";
import styles from "./access-notify.module.css";
import { auth, checkExpiry } from "@/auth";

export default async function AccessNotify() {
   const session = await auth();
   if (session && checkExpiry(session.accessToken))
      return (
         <div className={styles.notify}>
            <ExclamationCircle className="text-warning" />
            <div>
               osu! access token expired
               <br />
               Log in again to query API
            </div>
         </div>
      );
}
