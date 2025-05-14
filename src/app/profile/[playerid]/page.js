import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button, Card, CardBody, CardHeader, CardTitle, Form, FormControl } from "react-bootstrap";
import { getOpponentMappool } from "./actions";
import MatchHistoryItem from "./pvp/MatchHistoryItem";
import PvEResultsCard from "./pve/PvEResultsCard";
import db from "@/app/api/db/connection";
import Image from "next/image";
import { buildUrl } from "osu-web.js";
import CreatePvpStats from "./pvp/CreatePvPStats";

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
      osuid: playerid
      //hideLeaderboard: { $exists: false }
   });
   const user =
      playerid === session?.user.id
         ? player
         : await playersCollection.findOne({ osuid: session?.user.id });

   // If there's no player, or if we're trying to view a hidden player when we're not an admin
   if (!player || (player.hideLeaderboard && !user.admin)) return redirect("/leaderboard");
   const gamemode = user?.gamemode || "osu";

   const pvpStats = player[gamemode]?.pvp;
   const pveStats = player[gamemode]?.pve;
   return (
      <div className="d-flex flex-column gap-2">
         <div className="d-flex justify-content-between align-items-center px-2">
            <h1>
               <Image
                  alt="avatar"
                  src={buildUrl.userAvatar(player.osuid)}
                  height={64}
                  width={64}
                  className="rounded"
               />{" "}
               {player.osuname}
            </h1>
            <Image alt="Mode" src={`/mode-${gamemode}.png`} height={48} width={48} />
         </div>
         <Card>
            <CardHeader>Vs. Players</CardHeader>
            {pvpStats ? (
               <CardBody>
                  <div className="d-flex justify-content-between">
                     <TableData
                        data={[
                           [
                              "Rating",
                              `${pvpStats.rating.toFixed(0)} (rd: ${pvpStats.rd.toFixed(0)})`
                           ],
                           ["Wins", pvpStats.wins],
                           ["Losses", pvpStats.losses]
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
                     {pvpStats.matches.map((match, i) => (
                        <MatchHistoryItem key={i} match={match} />
                     ))}
                  </div>
               </CardBody>
            ) : (
               <CardBody className="d-flex justify-content-between align-items-center">
                  <span>
                     Play a match to create PvP stats{user === player && ", or click the button"}
                  </span>
                  {user === player && <CreatePvpStats playerid={playerid} gamemode={gamemode} />}
               </CardBody>
            )}
         </Card>
         {pveStats && (
            <PvEResultsCard
               data={pveStats}
               osuid={user === player ? playerid : null}
               mode={player.gamemode}
            />
         )}
      </div>
   );
}
