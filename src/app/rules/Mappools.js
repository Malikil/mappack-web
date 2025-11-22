import { MAX_TARGETS, MIN_TARGETS } from "@/helpers/rating-range";
import Link from "next/link";
import { Table } from "react-bootstrap";

export default function Mappools() {
   const osuTarget = (MIN_TARGETS.osu + MAX_TARGETS.osu) / 2000;
   const fruitsTarget = (MIN_TARGETS.fruits + MAX_TARGETS.fruits) / 2000;
   const taikoTarget = (MIN_TARGETS.taiko + MAX_TARGETS.taiko) / 2000;
   const maniaTarget = (MIN_TARGETS.mania + MAX_TARGETS.mania) / 2000;
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
                        <th>Target</th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr>
                        <td>osu!</td>
                        <td>{MIN_TARGETS.osu / 1000}k</td>
                        <td>{MAX_TARGETS.osu / 1000}k</td>
                        <td>{osuTarget}k</td>
                     </tr>
                     <tr>
                        <td>Catch</td>
                        <td>{MIN_TARGETS.fruits / 1000}k</td>
                        <td>{MAX_TARGETS.fruits / 1000}k</td>
                        <td>{fruitsTarget}k</td>
                     </tr>
                     <tr>
                        <td>Taiko</td>
                        <td>{MIN_TARGETS.taiko / 1000}k</td>
                        <td>{MAX_TARGETS.taiko / 1000}k</td>
                        <td>{taikoTarget}k</td>
                     </tr>
                     <tr>
                        <td>Mania</td>
                        <td>{MIN_TARGETS.mania / 1000}k</td>
                        <td>{MAX_TARGETS.mania / 1000}k</td>
                        <td>{maniaTarget}k</td>
                     </tr>
                  </tbody>
               </Table>
            </li>
         </ul>
      </div>
   );
}
