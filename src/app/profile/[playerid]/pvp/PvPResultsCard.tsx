import { Card, CardBody, CardHeader, CardTitle } from "react-bootstrap";
import ComponentInfoRows from "../ComponentInfoRows";
import MatchHistoryItem from "./MatchHistoryItem";
import AddPvPSession from "./AddPvpSession";
import { PvPInfo, WithRank } from "@/types/database.player";
import { GameMode } from "osu-web.js";

export default function PvPResultsCard({
   pvpStats,
   playerid,
   mode,
   allowSubmit
}: {
   pvpStats: WithRank<PvPInfo>;
   playerid: number;
   mode: GameMode;
   allowSubmit?: boolean;
}) {
   const provisional = pvpStats.wins < 3 && pvpStats.losses <= 3;
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
                        provisional && "Provisional",
                        `(rd: ${pvpStats.rd.toFixed(0)})`
                     ],
                     ["Wins", pvpStats.wins],
                     ["Losses", pvpStats.losses],
                     provisional ? null : ["Rank", `#${pvpStats.rank}`]
                  ].filter(v => v)}
               />
               <AddPvPSession playerid={playerid} allowSubmit={allowSubmit} />
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
