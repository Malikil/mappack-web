import { ExclamationCircle } from "react-bootstrap-icons";
import styles from "./admin-notify.module.css";

export default function AdminNotify() {
   return (
      <div className={styles.notify}>
         <ExclamationCircle className="text-warning" />
         <div>osu! access token expired</div>
      </div>
   );
}
