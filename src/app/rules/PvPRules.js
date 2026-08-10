export default function PvPRules() {
   return (
      <div>
         <h3>1v1 Matches</h3>
         <ul>
            <li>
               DM Commands:
               <ul>
                  <li>
                     <pre className="border rounded p-1 d-inline lh-lg">!q [mode]</pre> - Join the queue. If
                     no mode is specified &apos;osu&apos; is assumed.
                     <br />
                     Mode can be any of the following: osu, ctb, fruits, taiko, mania, 4k, 7k
                     <br />
                     If no key count is chosen for mania, you will be matched against any mania variant. If
                     neither player selected a key count, the key count will be unrestricted in the match.
                  </li>
                  <li>
                     <pre className="border rounded p-1 d-inline lh-lg">!unq</pre> - Leave the queue
                  </li>
                  <li>
                     <pre className="border rounded p-1 d-inline lh-lg">!r</pre> - When a match is found,
                     indicate you are ready to join the match
                  </li>
                  <li>
                     <pre className="border rounded p-1 d-inline lh-lg">!invite</pre> or{" "}
                     <pre className="border rounded p-1 d-inline lh-lg">!lobby</pre> - If you left a match in
                     progress, send a new invite for the lobby
                  </li>
               </ul>
            </li>
            <li id="pvp-lobby-commands">
               Lobby Commands:
               <ul>
                  <li>
                     <pre className="border rounded p-1 d-inline lh-lg">!info</pre> - Send a link to the
                     mappool, the current score/pick/ban, and a list of available maps
                  </li>
                  <li>
                     <pre className="border rounded p-1 d-inline lh-lg">nm#</pre> - Pick or ban the chosen map
                  </li>
               </ul>
            </li>
            <li>Supports all game modes</li>
            <li>ScoreV2, BO7, 2 bans each</li>
            <li>HD or HR is required on freemod maps</li>
            <li>
               If a tiebreaker is needed, the player who picked last will ban two additional maps, then the
               other player will pick a map to use from those remaining
            </li>
            <li>Tiebreakers will use freemod, though a mod is not required</li>
            <li>
               To join queue message Malikil with !q. The system will attempt to match you with a similarly
               skilled player
               <ul>
                  <li>To leave queue after joining, use !unq</li>
               </ul>
            </li>
            <li>When a match is found, you will be prompted to accept the match with !r</li>
            <li>When both players are ready the lobby is created and invites are sent</li>
            <li>
               Once both players are in the lobby, the bot will send a link to the mappool. The linked pool
               will be the one seen by the bot. Any pool preview generated through your profile is not
               guaranteed to be accurate
            </li>
         </ul>
      </div>
   );
}
