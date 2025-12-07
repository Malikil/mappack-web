import { MAX_TARGETS, MIN_TARGETS } from "@/helpers/rating-range";
import { Table } from "react-bootstrap";

export default function GeneralInfo() {
   const osuTarget = (MIN_TARGETS.osu + MAX_TARGETS.osu) / 2000;
   const fruitsTarget = (MIN_TARGETS.fruits + MAX_TARGETS.fruits) / 2000;
   const taikoTarget = (MIN_TARGETS.taiko + MAX_TARGETS.taiko) / 2000;
   const maniaTarget = (MIN_TARGETS.mania + MAX_TARGETS.mania) / 2000;
   return (
      <ul>
         <li>Each map is given a difficulty rating on the system</li>
         <li>Initial rating is based on SR, but ratings are allowed to deviate as scores are submitted</li>
         <li>
            Rating adjustments are based on the following score targets:
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
   );
}
