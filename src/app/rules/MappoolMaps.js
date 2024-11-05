import rulesConfig from "./rules-config";

export default function MappoolMaps() {
   return (
      <div>
         <h4>Maps</h4>
         <ul>
            <li>2 maps each of NoMod, HD, HR, DT, and Custom Mod (total 10 maps)</li>
            <li>
               Custom Mod allows you to pick which mods will be used for that map
               <ul>
                  <li>Mods can be any combination of: NoMod, HD, HR, DT, EZ, or HT</li>
                  <li>The two maps don&apos;t need to use the same mods</li>
               </ul>
            </li>
            <li>
               Maps must be within a certain star range each week:
               <ol>
                  {rulesConfig.starRating.map((range, i) => (
                     <li key={i}>
                        {range.min.toFixed(2)} - {range.max.toFixed(2)}
                     </li>
                  ))}
               </ol>
               <ul>
                  <li>Play-in matches will use the same star ranges as week 1</li>
                  <li>Maps don&apos;t need to be changed during play-in</li>
                  <li>EZ is ignored for star rating calculation</li>
               </ul>
            </li>
            <li>
               Each map should be more than 1:00 and less than 5:00 <strong>drain time</strong>
               <ul>
                  <li>Up to two maps may be above or below the drain limits by 10 seconds each.</li>
                  <li>
                     <strong>Full length</strong> of a song must not be above 6:00
                  </li>
                  <li>Drain time includes DT/HT</li>
               </ul>
            </li>
            <li>
               Total pool drain time must be between 18:20 - 32:30 (average 1:50 - 3:15 per map)
            </li>
            <li>
               If a map has less than 3 passes with the selected mods on the leaderboard, or no
               leaderboard at all, you <em>must</em> submit a screenshot showing a pass on that map
               <ul>
                  <li>The accuracy of the submitted screenshot must be at least 75%</li>
                  <li>Do not use NF for the pass screenshot</li>
                  <li>ScoreV2 is optional for pass screenshots</li>
               </ul>
            </li>
            <li>
               Unranked maps are allowed, as long as they&apos;re not too unreasonable
               <ul>
                  <li>
                     This includes things like 2B, notes outside the playfield, the whole map not
                     just being the same thing copied repeatedly, and notes being properly timed
                  </li>
                  <li>
                     You may not pick pending or graveyard maps which you mapped yourself (Loved,
                     etc are subject to regular conditions as above)
                  </li>
                  <li>Maps must have been submitted before the start of registrations</li>
               </ul>
            </li>
            <li>
               Different difficulties of the same set may be used in the same pool
               <ul>
                  <li>
                     If the two difficulties are basically the same map with different settings (eg.
                     AR) only one can be used
                  </li>
               </ul>
            </li>
            <li>Maps requiring the use of special skins or storyboard will be rejected</li>
            <li>
               <strong style={{ fontSize: "130%" }}>
                  Tournament staff may reject maps for any other reason if they feel it&apos;s not
                  appropriate for the tournament
               </strong>
            </li>
         </ul>
      </div>
   );
}
