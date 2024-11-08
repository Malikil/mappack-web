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
      </div>
   );
}
