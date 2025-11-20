export default function PvERules() {
   return (
      <div>
         <h3>Auto Lobbies</h3>
         <ul>
            <li>
               Endless Challenge:
               <ul>
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
                     When you run out of lives, the lobby will end and your results will be submitted to the
                     server
                  </li>
                  <li>
                     Commands:
                     <ul>
                        <li>
                           <pre className="border rounded p-1 d-inline lh-lg">!pve [mode]</pre> - Create a
                           lobby and invite you to it. If no mode is specified &apos;osu&apos; is assumed.
                           Specifying &apos;mania&apos; will not restrict key count
                           <br />
                           Mode can be any of the following: osu, ctb, fruits, taiko, mania, 4k, 7k
                        </li>
                        <li>
                           <pre className="border rounded p-1 d-inline lh-lg">skip</pre> - Skip the current
                           song and pick another one
                        </li>
                     </ul>
                  </li>
               </ul>
            </li>
            <li>
               Maplist:
               <ul>
                  <li>Play a specific list of maps with certain mods (like a tournament qualifier lobby)</li>
                  <li>Maplist is played once</li>
                  <li>
                     Commands:
                     <ul>
                        <li>
                           <pre className="border rounded p-1 d-inline lh-lg">
                              !quali [mode] ...[map|mod|shuffle]
                           </pre>
                           &nbsp;- Create a lobby and invite you to it. If no mode is specified &apos;osu&apos; is
                           assumed. Specifying &apos;mania&apos; will not restrict key count
                           <br />
                           Mode can be any of the following: osu, ctb, fruits, taiko, mania, 4k, 7k
                           <br />
                           Include <pre className="d-inline">shuffle</pre> at the beginning or end of the maps list to pick maps in
                           a random order
                           <br />
                           List maps by id, to change the selected mod put the mod ahead of the list of maps
                           that use it. Eg:
                           <br />
                           <pre className="border rounded p-1 d-inline lh-lg">
                              !quali osu nm 5188789 4956990 5210676 hd 5353008 4756048 hr 5248344 5288370 dt
                              5192352 4916977 fm 5349133 5045601 shuffle
                           </pre>
                        </li>
                     </ul>
                  </li>
               </ul>
            </li>
            <li>
               Auto Lobby:
               <ul>
                  <li>
                     The system will create a public lobby and automatically pick songs based on the weighted
                     average rating of all players
                  </li>
                  <li>
                     Commands:
                     <ul>
                        <li>
                           <pre className="border rounded p-1 d-inline lh-lg">!auto [mode]</pre> - Create a
                           lobby and invite you to it. If no mode is specified &apos;osu&apos; is assumed.
                           Specifying &apos;mania&apos; will not restrict key count
                           <br />
                           Mode can be any of the following: osu, ctb, fruits, taiko, mania, 4k, 7k
                        </li>
                     </ul>
                  </li>
               </ul>
            </li>
         </ul>
      </div>
   );
}
