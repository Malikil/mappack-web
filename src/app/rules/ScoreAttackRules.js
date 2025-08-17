export default function ScoreAttackRules() {
   return (
      <div>
         <h3>Score Rush</h3>
         <ul>
            <li>
               DM Commands:
               <ul>
                  <li>
                     <pre className="border rounded p-1 d-inline lh-lg">!pve [mode]</pre> - Create a lobby and
                     invite you to it. If no mode is specified &apos;osu&apos; is assumed. Specifying
                     &apos;mania&apos; will not restrict key count
                     <br />
                     Mode can be any of the following: osu, ctb, fruits, taiko, mania, 4k, 7k
                  </li>
               </ul>
            </li>
            <li>
               Lobby Commands:
               <ul>
                  <li>
                     <pre className="border rounded p-1 d-inline lh-lg">skip</pre> - Skip the current song and
                     pick another one
                  </li>
                  <li>
                     <pre className="border rounded p-1 d-inline lh-lg">!public</pre> - Remove the password
                     from the lobby, allowing anyone to join
                  </li>
               </ul>
            </li>
            <li>The system will choose maps of appropriate skill for you</li>
            <li>
               Start with 50 life, gain or lose lives based on your score achieved.
               <ul>
                  <li>Target score is higher than listed above</li>
               </ul>
            </li>
            <li>If you are failed at the end of a map, lose an extra 10 lives</li>
            <li>Skipping a song costs one life</li>
            <li>The same mod won&apos;t be picked twice in a row, except NM which is unrestricted</li>
            <li>
               When you run out of lives, the lobby will end and your results will be submitted to the server
            </li>
         </ul>
      </div>
   );
}
