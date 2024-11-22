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
                  <li>
                     A notification with your maplist will pop up. Formatted in a way it can be
                     copied into the result submittion area
                  </li>
                  <li>
                     Play each map, the score goes on the same line as the mapid/mod, with a space
                     between mod and score:{" "}
                     <pre className="border rounded p-1 d-inline">[mapid]+[mod] [score]</pre>
                  </li>
                  <li>When all maps are done, submit scores</li>
               </ol>
            </li>
         </ul>
      </div>
   );
}
