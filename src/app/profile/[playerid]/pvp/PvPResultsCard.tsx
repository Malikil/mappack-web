import { Button, Card, CardBody, CardHeader, CardTitle, Form, FormControl } from "react-bootstrap";
import ComponentInfoRows from "../ComponentInfoRows";
import MatchHistoryItem from "./MatchHistoryItem";
import { serverActionToast } from "@/toaster";
import { submitPvp } from "./actions";
import AddPvPSession from "./AddPvpSession";

export default function PvPResultsCard({ pvpStats, playerid, mode }) {
   return (
      <Card>
         <CardHeader>Vs. Players</CardHeader>
         <CardBody>
            <div className="d-flex justify-content-between">
               <ComponentInfoRows
                  data={[
                     [
                        "Rating",
                        pvpStats.rating.toFixed(0),
                        pvpStats.wins < 3 && pvpStats.losses < 3 && "Provisional",
                        `(rd: ${pvpStats.rd.toFixed(0)})`
                     ],
                     ["Wins", pvpStats.wins],
                     ["Losses", pvpStats.losses]
                  ]}
               />
               <AddPvPSession playerid={playerid} />
            </div>
            <hr />
            <CardTitle>Match History</CardTitle>
            <div className="d-flex flex-column gap-1">
               {pvpStats.matches.map((match, i) => (
                  <MatchHistoryItem key={i} match={match} mode={mode} />
               ))}
            </div>
         </CardBody>
      </Card>
   );
}
