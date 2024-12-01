import { Card, CardBody, CardHeader, CardTitle } from "react-bootstrap";
import AttackButton from "../AttackButton";
import ScoreHistoryItem from "./ScoreHistoryItem";
import ComponentInfoRows from "../ComponentInfoRows";
import AddPvESession from "./AddPveSession";

export default function PvEResultsCard({ data, osuid }) {
   return (
      <Card>
         <CardHeader>Score Attack</CardHeader>
         <CardBody>
            <div className="d-flex">
               <ComponentInfoRows
                  data={[
                     ["Rating", data.rating.toFixed(0)],
                     ["Rating Deviation", data.rd.toFixed(0)],
                     ["Games", data.games]
                  ]}
               />
               <div className="d-flex flex-column align-items-end gap-1 ms-auto">
                  <AttackButton userId={osuid} />
                  <AddPvESession />
               </div>
            </div>
            <hr />
            <CardTitle>Match History</CardTitle>
            <div className="d-flex flex-column gap-1">
               {data.matches.map((match, i) => (
                  <ScoreHistoryItem key={i} match={match} />
               ))}
            </div>
         </CardBody>
      </Card>
   );
}
