import { Card, CardBody, CardHeader, CardTitle } from "react-bootstrap";
import ScoreHistoryItem from "./ScoreHistoryItem";
import ComponentInfoRows from "../ComponentInfoRows";
import AddPvESession from "./AddPveSession";
import { PvEInfo } from "@/types/database.player";
import { GameMode } from "osu-web.js";

export default function PvEResultsCard({
   data,
   osuid,
   mode
}: {
   data: PvEInfo;
   osuid: number;
   mode: GameMode;
}) {
   const provisional = data.songs < 10 || data.games < 3;

   return (
      <Card>
         <CardHeader>Score Attack</CardHeader>
         <CardBody>
            <div className="d-flex">
               <ComponentInfoRows
                  data={[
                     ["Rating", data.rating.toFixed(0), provisional && "Provisional"],
                     ["Deviation", data.rd.toFixed(0)],
                     ["Games", data.games, `${data.songs} maps`]
                  ].filter(v => v)}
               />
               {osuid && <AddPvESession />}
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
