import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardBody, CardHeader } from "react-bootstrap";
import PvEResultsCard from "./pve/PvEResultsCard";
import { playersDb } from "@/app/api/db/connection";
import Image from "next/image";
import { buildUrl } from "osu-web.js";
import CreatePvpStats from "./pvp/CreatePvpStats";
import PvPResultsCard from "./pvp/PvPResultsCard";
import ModSkills from "./ModSkills";
import Link from "next/link";

export default async function Profile({ params }) {
   const playerParam = (await params).playerid;
   const playerid = parseInt(playerParam);
   if (!playerid) {
      // If the playerid is a string, lookup by name and redirect to the id url
      const player = await playersDb.findOne({ osuname: playerParam });
      if (player) return redirect(`/profile/${player._id}`);
      else return redirect(`/leaderboard`);
   }
   const session = await auth();
   const user = await playersDb.findOne({ _id: session?.user.id });
   const gamemode = user?.gamemode || "osu";
   const player = await playersDb.findOne({ _id: playerid });
   if (!player) return redirect("/leaderboard");

   const pvpStats = player[gamemode].pvp;
   const pveStats = player[gamemode].pve;
   const pools = player[gamemode].pools;
   return (
      <div className="d-flex flex-column gap-2">
         <div className="d-flex justify-content-between align-items-center px-2">
            <h1>
               <Link
                  href={buildUrl.user(player._id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-reset text-decoration-none"
               >
                  <Image
                     alt="avatar"
                     src={buildUrl.userAvatar(player._id)}
                     height={64}
                     width={64}
                     className="rounded"
                  />{" "}
                  {player.osuname}
               </Link>
            </h1>
            <Image alt="Mode" src={`/mode-${gamemode}.png`} height={48} width={48} />
         </div>
         {pvpStats?.rating ? (
            <PvPResultsCard
               pvpStats={pvpStats}
               playerid={playerid}
               mode={gamemode}
               allowSubmit={user?._id === player._id}
            />
         ) : (
            <Card>
               <CardHeader>Vs. Players</CardHeader>
               <CardBody className="d-flex justify-content-between align-items-center">
                  <span>
                     Play a match to create PvP stats{user?._id === player._id && ", or click the button"}
                  </span>
                  {user?._id === player._id && <CreatePvpStats playerid={playerid} gamemode={gamemode} />}
               </CardBody>
            </Card>
         )}
         {pveStats && (
            <PvEResultsCard
               data={pveStats}
               osuid={user?._id === player._id ? playerid : null}
               mode={gamemode}
            />
         )}
         {user?._id === player._id && (
            <ModSkills mods={player[gamemode].mods} skills={player[gamemode].styles} />
         )}
      </div>
   );
}
