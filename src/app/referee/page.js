import MatchInfo from "./components/MatchInfo";
import SetupCommands from "./components/SetupCommands";

export default function Referee() {
   return (
      <div className="d-flex flex-column gap-2">
         <div className="d-flex gap-2">
            <SetupCommands />
         </div>
         <MatchInfo />
      </div>
   );
}
