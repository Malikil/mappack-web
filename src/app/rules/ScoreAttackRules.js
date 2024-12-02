export default function ScoreAttackRules() {
   return (
      <div>
         <h3>Score Attack</h3>
         <ul>
            <li>Solo mode</li>
            <li>The system will select 7 maps for you to play</li>
            <li>Maps are played once each, in order</li>
            <li>Try to get the best score you can</li>
            <li>
               Score tracking is currently a manual process
               <ol>
                  <li>Go to your profile</li>
                  <li>
                     Click <pre className="border rounded p-1 d-inline">Generate Score Attack</pre>
                  </li>
                  <li>A notification with your maplist will pop up</li>
                  <li>
                     Play each map in a multiplayer lobby. You can use the command{" "}
                     <pre className="border rounded p-1 d-inline">!mp start</pre> to start a song by
                     yourself
                     <br />
                     Make sure Score v2 is selected
                  </li>
                  <li>When all maps are done, copy the mp link and put it into the submit box.</li>
                  <li>
                     There is no system in place to avoid duplicates. Make sure you only submit the
                     lobby once
                  </li>
               </ol>
            </li>
         </ul>
      </div>
   );
}
