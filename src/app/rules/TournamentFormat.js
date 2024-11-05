import rulesConfig from "./rules-config";

export default function TournamentFormat() {
   return (
      <div>
         <h3>Tournament Format</h3>
         <ul>
            <li>
               1v1, ScoreV2, Double Elimination bracket
               <ul>
                  <li>
                     If there are more than 32 players, single elimination seeded play-in matches
                     will be used to determine which 32 players will play in the main bracket.
                  </li>
                  <li>Players are seeded based on global rank.</li>
                  <li>
                     Specific format for play-ins may be updated based on player sentiment and how
                     many sign ups there actually are.
                  </li>
               </ul>
            </li>
            <li>
               Any single elimination matches will be BO7. Double elim stage will be BO
               {rulesConfig.bestOf.join("/")}
            </li>
            <li>NF will be used on all maps</li>
            <li>No rank restrictions</li>
            <li>
               Players select their pool each week. See <a href="#mappools">Mappools</a>
            </li>
            <li>Pick maps from opponent&apos;s pool in matches</li>
            <li>No bans</li>
            <li>
               If the same map is in both players&apos; pools, either player may pick the map, but
               it may only be picked once in the match.
               <ul>
                  <li>
                     If the mods are different in each pool, the used mod will depend on who picked
                     the map. The map can still only get picked once
                  </li>
                  <li>Different difficulties of the same mapset are treated as different maps.</li>
               </ul>
            </li>
            <li>All times are in UTC</li>
            <li>
               Joining the discord server is required. All communication and important information
               will be announced there
            </li>
            <li>Register by posting to the #register channel in the discord server</li>
            <li>
               Once pool submissions are closed, no further changes can be made. Tournament staff
               will not chase after you to complete your pools.
            </li>
         </ul>
      </div>
   );
}
