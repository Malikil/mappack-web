import { auth } from "@/auth";
import { redirect } from "next/navigation";
import db from "../api/db/connection";
import { Button, Card, CardBody, CardHeader, CardTitle, Form, FormControl } from "react-bootstrap";
import { getMappool, getOpponentMappool, register } from "./actions";
import { revalidatePath } from "next/cache";
import MatchHistoryItem from "./MatchHistoryItem";
import ScoreHistoryItem from "./ScoreHistoryItem";
import AttackButton from "./AttackButton";
import AddPvESession from "./pve/AddPveSession";
import AddPvPSession from "./pvp/AddPvPSession";

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

export default async function Profile() {
   const session = await auth();

   if (!session) return redirect("/");
   const playersCollection = db.collection("players");
   const player = await playersCollection.findOne({ osuid: session.user.id });

   if (!player)
      return (
         <div>
            <form
               action={async () => {
                  "use server";
                  await register(session.user.id, session.user.name);
                  revalidatePath("/profile");
               }}
            >
               <Button type="submit">Register</Button>
            </form>
         </div>
      );

   return (
      <div className="d-flex flex-column gap-2">
         <Card>
            <CardHeader>Vs. Players</CardHeader>
            <CardBody>
               <div className="d-flex justify-content-between">
                  <TableData
                     data={[
                        ["Rating", player.pvp.rating.toFixed(0)],
                        ["Wins", player.pvp.wins],
                        ["Losses", player.pvp.losses]
                     ]}
                  />
                  <Form
                     action={async formData => {
                        "use server";
                        return getOpponentMappool(session.user.id, formData);
                     }}
                     className="d-flex gap-1 mb-auto"
                  >
                     <FormControl type="text" name="opponent" placeholder="Opponent" />
                     <Button className="text-nowrap" type="submit">
                        View Pool
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
         <Card>
            <CardHeader>Score Attack</CardHeader>
            <CardBody>
               <div className="d-flex">
                  <TableData
                     data={[
                        ["Rating", player.pve.rating.toFixed(0)],
                        ["Rating Deviation", player.pve.rd.toFixed(0)],
                        ["Games", player.pve.games]
                     ]}
                  />
                  <div className="ms-auto">
                     <AttackButton userId={session.user.id} />
                  </div>
               </div>
               <hr />
               <CardTitle>Match History</CardTitle>
               <div className="d-flex flex-column gap-1">
                  {player.pve.matches.map((match, i) => (
                     <ScoreHistoryItem key={i} match={match} />
                  ))}
               </div>
            </CardBody>
         </Card>
         <div className="d-flex gap-2">
            <AddPvPSession />
            <AddPvESession />
         </div>
      </div>
   );
}
