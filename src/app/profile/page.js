import { auth } from "@/auth";
import { redirect } from "next/navigation";
import db from "../api/db/connection";
import { Button, Card, CardBody, CardHeader, CardTitle } from "react-bootstrap";
import { register } from "./actions";
import { revalidatePath } from "next/cache";
import MatchHistoryItem from "./MatchHistoryItem";
import ScoreHistoryItem from "./ScoreHistoryItem";
import AttackButton from "./AttackButton";
import AddPvESession from "./pve/AddPveSession";
import Link from "next/link";
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
               <div className="d-flex">
                  <TableData
                     data={[
                        ["Rating", player.pvp.rating.toFixed(0)],
                        ["Wins", player.pvp.wins],
                        ["Losses", player.pvp.losses]
                     ]}
                  />
                  <div className="ms-auto">
                     <Link href={`/mappool/${session.user.id}`}>
                        <Button>Pool Preview</Button>
                     </Link>
                  </div>
               </div>
               {player.pvp.matches.length > 0 && (
                  <Card className="mt-2">
                     <CardHeader>Match History</CardHeader>
                     <CardBody>
                        <MatchHistoryItem />
                     </CardBody>
                  </Card>
               )}
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
