import Mappools from "./Mappools";
import PvPRules from "./PvPRules";
import PvERules from "./PvERules";

export default function InfoAndRules() {
   return (
      <div>
         <h2>Info and Rules</h2>
         <Mappools />
         <PvPRules />
         <PvERules />
         <hr />
         <h5>Links</h5>
         <ul>
            <li>
               <a href="https://github.com/Malikil/mappack-web">Github</a>
            </li>
         </ul>
      </div>
   );
}
