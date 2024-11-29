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
               To join the queue message Malikil with !pvp/!q/!queue. The system will attempt to
               match you with a similarly skilled player
            </li>
            <li>To leave queue after joining, use !unq/!unqueue</li>
            <li>
               When a match is found, a lobby will be created automatically and you will be invited
               to it
            </li>
         </ul>
      </div>
   );
}
