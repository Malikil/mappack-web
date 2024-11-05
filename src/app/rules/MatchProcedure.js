import rulesConfig from "./rules-config";

export default function MatchProcedure() {
   return (
      <div>
         <h2>Match Procedure</h2>
         <ul>
            <li>
               A referee will make contact with players a few minutes before match time to make sure
               everyone is ready.
            </li>
            <li>
               If a player isn&apos;t in the lobby by 10 minutes past match time, they forfeit the
               match automatically.
            </li>
            <li>
               Once all players are in the lobby, each player may select 1 warmup map of less than 4
               minutes
            </li>
            <li>
               After warmups both players will roll. Higher roll decided if they want first or
               second pick
            </li>
            <li>NF and ScoreV2 will be used on all maps.</li>
            <li>
               Players pick maps from their opponent&apos;s pool
               <ul>
                  <li>
                     If the same map is in both pools, then either player may pick the map. But is
                     may only be picked once during the match.
                  </li>
                  <li>
                     If different difficulties of the same mapset are in each pool, they are treated
                     as different maps.
                  </li>
               </ul>
            </li>
            <li>Players alternate picking maps</li>
            <li>Matches are BO{rulesConfig.bestOf.join("/")}</li>
            <li>
               If both players are tied with one map left to play a tiebreaker map will be played
               <ul>
                  <li>I&apos;ll come up with tiebreaker stuff later</li>
               </ul>
            </li>
         </ul>
      </div>
   );
}
