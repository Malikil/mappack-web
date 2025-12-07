import Mappools from "./Mappools";
import PvPRules from "./PvPRules";
import PvERules from "./PvERules";
import GeneralInfo from "./GeneralInfo";

export default function InfoAndRules() {
   return (
      <div>
         <h2>General Info</h2>
         <GeneralInfo />
         <h2>osu! Mappack Solo Queue</h2>
         <Mappools />
         <PvPRules />
         <h2>PvE and Tools</h2>
         <PvERules />
      </div>
   );
}
