export default function ScoreAttackRules() {
   return (
      <div>
         <h3>Score Attack</h3>
         <ul>
            <li>Play maps in a multiplayer lobby</li>
            <li>Submit the mp link through your profile</li>
            <li>Your PvE rating will be updated based on ranked/loved maps that you played in the lobby</li>
            <li>
               If you want the system to recommend maps from the current rotation, you can click{" "}
               <pre className="border rounded p-1 d-inline">Generate Score Attack</pre> on your profile
            </li>
            <li>The mp parser will ignore maps that were not played with Head to Head</li>
            <li>
               Maps played using Score v1 will be approximated using the following formula:
               <p className="border rounded py-1 px-2 font-monospace">
                  Acc component &nbsp; = 300,000 x acc ^ 5 <br />
                  Combo component = 500,000 x (max combo / available combo)
                  <br />
                  Miss component &nbsp;= 200,000 / (miss count + 1)
               </p>
            </li>
         </ul>
      </div>
   );
}
