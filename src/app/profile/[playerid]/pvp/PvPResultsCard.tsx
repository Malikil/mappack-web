import { Card, CardBody, CardHeader, CardTitle } from "react-bootstrap";
import ComponentInfoRows from "../ComponentInfoRows";
import MatchHistoryItem from "./MatchHistoryItem";
import AddPvPSession from "./AddPvpSession";
import { PvPInfo } from "@/types/database.player";
import { GameMode } from "osu-web.js";

export default function PvPResultsCard({
   pvpStats,
   playerid,
   mode
}: {
   pvpStats: PvPInfo;
   playerid: number;
   mode: GameMode;
}) {
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
