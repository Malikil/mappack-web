import Link from "next/link";
import { Table } from "react-bootstrap";

export default function Mappools() {
   return (
      <div>
         <h3 id="mappools">Mappools</h3>
         <ul>
            <li>
               Maps are taken from officially released mappacks. A list of packs is available{" "}
               <Link href="https://osu.ppy.sh/beatmaps/packs" target="_blank" rel="noopener noreferrer">
                  here
               </Link>
            </li>
            <li>A new mappack will the used each Monday</li>
            <li>Two packs will be active at a time</li>
            <li>Each difficulty is taken individually</li>
            <li>
               Maps are given a rating on the system. The initial rating is determined from the map&apos;s
               star rating
            </li>
            <li>As different maps are used in matches, the map&apos;s rating will also be adjusted</li>
            <li>
               Depending on the game mode, the system will attempt to select maps where the player&apos;s
               expected score is within a certain range:
               <Table>
                  <thead>
                     <tr>
                        <th>Mode</th>
                        <th>Minimum</th>
                        <th>Maximum</th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr>
                        <td>osu!</td>
                        <td>300k</td>
                        <td>900k</td>
                     </tr>
                     <tr>
                        <td>Catch</td>
                        <td>500k</td>
                        <td>900k</td>
                     </tr>
                     <tr>
                        <td>Taiko</td>
                        <td>300k</td>
                        <td>900k</td>
                     </tr>
                     <tr>
                        <td>Mania</td>
                        <td>tbd</td>
                        <td></td>
                     </tr>
                  </tbody>
               </Table>
            </li>
         </ul>
      </div>
   );
}
