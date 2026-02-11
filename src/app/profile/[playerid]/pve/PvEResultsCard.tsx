import { Card, CardBody, CardHeader, CardTitle } from "react-bootstrap";
import ScoreHistoryItem from "./ScoreHistoryItem";
import ComponentInfoRows from "../ComponentInfoRows";
import AddPvESession from "./AddPveSession";
import { PvEInfo } from "@/types/database.player";
import { GameMode } from "osu-web.js";
import { prettyRating } from "@/helpers/rating-range";

export default function PvEResultsCard({
   data,
   mode,
   activePlayer
}: {
   data: PvEInfo;
   mode: GameMode;
   activePlayer?: boolean;
}) {
   const provisional = data.rd >= 150 || data.games < 3;

   return (
      <Card>
         <CardHeader>General Play</CardHeader>
         <CardBody>
            <div className="d-flex">
               <ComponentInfoRows
                  data={[
                     ["Rating", prettyRating(data.rating), provisional && "Provisional"],
                     ["Deviation", data.rd.toFixed(0)],
                     ["Lobbies", data.games, `${data.songs} maps`]
                  ].filter(v => v)}
               />
               {activePlayer && <AddPvESession />}
            </div>
            {activePlayer && (
               <>
                  <hr />
                  <CardTitle>Match History</CardTitle>
                  <div className="d-flex flex-column gap-1">
                     {data.matches.map((match, i) => (
                        <ScoreHistoryItem key={i} match={match} mode={mode} />
                     ))}
                  </div>
               </>
            )}
         </CardBody>
      </Card>
   );
}
