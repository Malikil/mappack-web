export default function ScoreAttackRules() {
   return (
      <div>
         <h3>Score Attack</h3>
         <ul>
            <li>Play maps using Score v2 in multiplayer</li>
            <li>Submit the mp link through your profile</li>
            <li>Your PvE rating will be updated based on ranked/loved maps that you played in the lobby</li>
            <li>
               If you want the system to recommend maps from the current rotation, you can click{" "}
               <pre className="border rounded p-1 d-inline">Generate Score Attack</pre> on your profile
            </li>
            <li>The mp parser will ignore maps that were not played with Head to Head and Score v2</li>
         </ul>
      </div>
   );
}
