import { MAX_TARGETS, MIN_TARGETS, MIN_ABSOLUTE, MAX_ABSOLUTE } from "@/helpers/rating-range";
import { Table } from "react-bootstrap";

export default function GeneralInfo() {
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
                     <th>Scorable Range</th>
                  </tr>
               </thead>
               <tbody>
                  <tr>
                     <td>osu!</td>
                     <td>{(MIN_TARGETS.osu / 1000).toFixed()}k</td>
                     <td>{(MAX_TARGETS.osu / 1000).toFixed()}k</td>
                     <td>
                        {(MIN_ABSOLUTE.osu / 1000).toFixed()}k - {(MAX_ABSOLUTE.osu / 1000).toFixed()}k
                     </td>
                  </tr>
                  <tr>
                     <td>Catch</td>
                     <td>{(MIN_TARGETS.fruits / 1000).toFixed()}k</td>
                     <td>{(MAX_TARGETS.fruits / 1000).toFixed()}k</td>
                     <td>
                        {(MIN_ABSOLUTE.fruits / 1000).toFixed()}k - {(MAX_ABSOLUTE.fruits / 1000).toFixed()}k
                     </td>
                  </tr>
                  <tr>
                     <td>Taiko</td>
                     <td>{(MIN_TARGETS.taiko / 1000).toFixed()}k</td>
                     <td>{(MAX_TARGETS.taiko / 1000).toFixed()}k</td>
                     <td>
                        {(MIN_ABSOLUTE.taiko / 1000).toFixed()}k - {(MAX_ABSOLUTE.taiko / 1000).toFixed()}k
                     </td>
                  </tr>
                  <tr>
                     <td>Mania</td>
                     <td>{(MIN_TARGETS.mania / 1000).toFixed()}k</td>
                     <td>{(MAX_TARGETS.mania / 1000).toFixed()}k</td>
                     <td>
                        {(MIN_ABSOLUTE.mania / 1000).toFixed()}k - {(MAX_ABSOLUTE.mania / 1000).toFixed()}k
                     </td>
                  </tr>
               </tbody>
            </Table>
            These targets are updated after the qualifier stage of each world cup. By taking an average of the
            previous target and new qualifier scores.
         </li>
      </ul>
   );
}
