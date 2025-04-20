export default function ScoreAttackRules() {
   return (
      <div>
         <h3>Score Attack</h3>
         <ul>
            <li>Solo/leaderboard mode</li>
            <li>Play maps from the pool on your own time</li>
            <li>Try to get the best score you can</li>
            <li>
               Score tracking is currently a manual process
               <ol>
                  <li>Go to your profile</li>
                  <li>
                     (Optional) Click{" "}
                     <pre className="border rounded p-1 d-inline">Generate Score Attack</pre> to get
                     a recommended maplist
                  </li>
                  <li>A notification with your maplist will pop up</li>
                  <li>
                     Play each map in a multiplayer lobby. You can use the command{" "}
                     <pre className="border rounded p-1 d-inline">!mp start</pre> to start a song
                     when no other players are in the lobby
                     <br />
                     Make sure Score v2 is selected
                  </li>
                  <li>When all maps are done, copy the mp link and put it into the submit box.</li>
               </ol>
            </li>
            <li>
               The mp parser <em>should</em> still work fine even if:
               <ul>
                  <li>People leave/join while the lobby is in progress</li>
                  <li>More or less than 7 maps are played</li>
                  <li>Maps not on the maplist are played</li>
               </ul>
            </li>
         </ul>
      </div>
   );
}
