import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button, Card, CardBody, CardHeader, CardTitle, Form, FormControl } from "react-bootstrap";
import { getOpponentMappool } from "./actions";
import MatchHistoryItem from "./pvp/MatchHistoryItem";
import PvEResultsCard from "./pve/PvEResultsCard";
import db from "@/app/api/db/connection";

const TableData = ({ data }) => (
   <table>
      <tbody>
         {data.map((r, i) => (
            <tr key={i}>
               <td>{r[0]}</td>
               <td className="ps-2">{r[1]}</td>
            </tr>
         ))}
      </tbody>
   </table>
);

export default async function Profile({ params }) {
   const playerid = parseInt((await params).playerid);
   const session = await auth();

   const playersCollection = db.collection("players");
   const player = await playersCollection.findOne({
      osuid: playerid,
      hideLeaderboard: { $exists: false }
   });

   if (!player) return redirect("/leaderboard");

   return (
      <div className="d-flex flex-column gap-2">
         <Card>
            <CardHeader>Vs. Players</CardHeader>
            <CardBody>
               <div className="d-flex justify-content-between">
                  <TableData
                     data={[
                        [
                           "Rating",
                           `${player.pvp.rating.toFixed(0)} (rd: ${player.pvp.rd.toFixed(0)})`
                        ],
                        ["Wins", player.pvp.wins],
                        ["Losses", player.pvp.losses]
                     ]}
                  />
                  <Form
                     action={async formData => {
                        "use server";
                        return getOpponentMappool(playerid, formData);
                     }}
                     className="d-flex gap-1 mb-auto"
                  >
                     <FormControl type="text" name="opponent" placeholder="Opponent" />
                     <Button className="text-nowrap" type="submit">
                        Preview Pool
                     </Button>
                  </Form>
               </div>
               <hr />
               <CardTitle>Match History</CardTitle>
               <div className="d-flex flex-column gap-1">
                  {player.pvp.matches.map((match, i) => (
                     <MatchHistoryItem key={i} match={match} />
                  ))}
               </div>
            </CardBody>
         </Card>
         <PvEResultsCard
            data={player.pve}
            osuid={session?.user.id === playerid ? playerid : null}
         />
      </div>
   );
}
