import Mappools from "./Mappools";
import PvPRules from "./PvPRules";
import ScoreAttackRules from "./ScoreAttackRules";

export default function InfoAndRules() {
   return (
      <div>
         <h2>Info and Rules</h2>
         <Mappools />
         <PvPRules />
         <ScoreAttackRules />
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
