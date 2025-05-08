import { Card, CardBody, CardHeader, CardTitle } from "react-bootstrap";
import ScoreHistoryItem from "./ScoreHistoryItem";
import ComponentInfoRows from "../ComponentInfoRows";
import AddPvESession from "./AddPveSession";

export default function PvEResultsCard({ data, osuid, mode }) {
   return (
      <Card>
         <CardHeader>Score Attack</CardHeader>
         <CardBody>
            <div className="d-flex">
               <ComponentInfoRows
                  data={[
                     ["Rating", data.rating.toFixed(0)],
                     ["Deviation", data.rd.toFixed(0)],
                     ["Games", data.games]
                  ]}
               />
               {osuid && <AddPvESession userId={osuid} />}
            </div>
            <hr />
            <CardTitle>Match History</CardTitle>
            <div className="d-flex flex-column gap-1">
               {data.matches.map((match, i) => (
                  <ScoreHistoryItem key={i} match={match} mode={mode} />
               ))}
            </div>
         </CardBody>
      </Card>
   );
}
