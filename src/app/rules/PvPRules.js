export default function PvPRules() {
   return (
      <div>
         <h3>1v1 Matches</h3>
         <ul>
            <li>ScoreV2, BO7, 2 bans each</li>
            <li>HD or HR is required on freemod maps</li>
            <li>
               Tiebreakers are not implemented. The player who picked first will also be picking
               last. Players can decide for themselves what to do about a tiebreaker situation
            </li>
            <li>
               To join queue message Malikil with !pvp/!q/!queue. The system will attempt to match
               you with a similarly skilled player
               <ul>
                  <li>To leave queue after joining, use !unq/!unqueue</li>
               </ul>
            </li>
            <li>When a match is found, you will be prompted to accept the match with !ready/!r</li>
            <li>When both players are ready the lobby is created and invites are sent</li>
            <li>
               Once both players are in the lobby, the bot will send a link to the mappool. The
               linked pool will be the one seen by the bot. Any pool preview generated through your
               profile is not guaranteed to remain accurate for the duration of the match (other
               matches which finish may affect ratings and may affect what maps are picked)
            </li>
            <li>
               Ban maps with !ban/!b and the mod/number eg:{" "}
               <pre className="border rounded p-1 d-inline">!ban NM3</pre>
            </li>
            <li>Pick maps with !pick/!p</li>
         </ul>
      </div>
   );
}
