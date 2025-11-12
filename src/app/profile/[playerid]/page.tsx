import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card, CardBody, CardHeader } from "react-bootstrap";
import PvEResultsCard from "./pve/PvEResultsCard";
import { playersDb } from "@/app/api/db/connection";
import Image from "next/image";
import { buildUrl } from "osu-web.js";
import CreatePvpStats from "./pvp/CreatePvpStats";
import PvPResultsCard from "./pvp/PvPResultsCard";
import { DbPlayer, RankedPlayer } from "@/types/database.player";
import PoolSetupCard from "./pools/PoolSetupCard";

export default async function Profile({ params }) {
   const playerParam = (await params).playerid;
   const playerid = parseInt(playerParam);
   if (!playerid) {
      // If the playerid is a string, lookup by name and redirect to the id url
      const player = await playersDb.findOne({ osuname: playerParam });
      if (player) return redirect(`/profile/${player.osuid}`);
      else return redirect(`/leaderboard`);
   }
   const session = await auth();
   const user = await playersDb.findOne({ osuid: session?.user.id });
   const gamemode = user?.gamemode || "osu";

   const player = (
      await playersDb
         .aggregate<RankedPlayer<DbPlayer, typeof gamemode>>([
            {
               $setWindowFields: {
                  partitionBy: {
                     $or: [{ $gt: [`$${gamemode}.pvp.wins`, 2] }, { $gt: [`$${gamemode}.pvp.losses`, 3] }]
                  },
                  sortBy: { [`${gamemode}.pvp.rating`]: -1 },
                  output: {
                     [`${gamemode}.pvp.rank`]: { $rank: {} }
                  }
               }
            },
            {
               $setWindowFields: {
                  partitionBy: {
                     $and: [{ $gt: [`$${gamemode}.pve.songs`, 10] }, { $gt: [`$${gamemode}.pve.games`, 2] }]
                  },
                  sortBy: { [`${gamemode}.pve.rating`]: -1 },
                  output: {
                     [`${gamemode}.pve.rank`]: { $rank: {} }
                  }
               }
            },
            { $match: { osuid: playerid } }
         ])
         .toArray()
   )[0];
   if (!player) return redirect("/leaderboard");

   const pvpStats = player[gamemode].pvp;
   const pveStats = player[gamemode].pve;
   const pools = player[gamemode].pools;
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
         {pvpStats?.rating ? (
            <PvPResultsCard
               pvpStats={pvpStats}
               playerid={playerid}
               mode={gamemode}
               allowSubmit={user?.osuid === player.osuid}
            />
         ) : (
            <Card>
               <CardHeader>Vs. Players</CardHeader>
               <CardBody className="d-flex justify-content-between align-items-center">
                  <span>
                     Play a match to create PvP stats{user?.osuid === player.osuid && ", or click the button"}
                  </span>
                  {user?.osuid === player.osuid && <CreatePvpStats playerid={playerid} gamemode={gamemode} />}
               </CardBody>
            </Card>
         )}
         {pveStats && (
            <PvEResultsCard
               data={pveStats}
               osuid={user?.osuid === player.osuid ? playerid : null}
               mode={gamemode}
            />
         )}
         {user.osuid === player.osuid && <PoolSetupCard data={pools} osuid={player.osuid} mode={gamemode} />}
      </div>
   );
}
