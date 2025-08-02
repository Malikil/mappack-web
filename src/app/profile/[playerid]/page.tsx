import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button, Card, CardBody, CardHeader, CardTitle, Form, FormControl } from "react-bootstrap";
import MatchHistoryItem from "./pvp/MatchHistoryItem";
import PvEResultsCard from "./pve/PvEResultsCard";
import { playersDb } from "@/app/api/db/connection";
import Image from "next/image";
import { buildUrl } from "osu-web.js";
import CreatePvpStats from "./pvp/CreatePvpStats";
import ComponentInfoRows from "./ComponentInfoRows";
import PvPResultsCard from "./pvp/PvPResultsCard";

export default async function Profile({ params }) {
   const playerid = parseInt((await params).playerid);
   const session = await auth();
   const player = await playersDb.findOne({
      osuid: playerid
      //hideLeaderboard: { $exists: false }
   });
   const user = playerid === session?.user.id ? player : await playersDb.findOne({ osuid: session?.user.id });

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
         {pvpStats ? (
            <PvPResultsCard pvpStats={pvpStats} playerid={playerid} mode={gamemode} />
         ) : (
            <Card>
               <CardHeader>Vs. Players</CardHeader>
               <CardBody className="d-flex justify-content-between align-items-center">
                  <span>Play a match to create PvP stats{user === player && ", or click the button"}</span>
                  {user === player && <CreatePvpStats playerid={playerid} gamemode={gamemode} />}
               </CardBody>
            </Card>
         )}
         {pveStats && (
            <PvEResultsCard data={pveStats} osuid={user === player ? playerid : null} mode={gamemode} />
         )}
      </div>
   );
}
