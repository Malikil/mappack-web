import { Card, CardBody, CardHeader, CardImg, CardText, CardTitle, Table } from "react-bootstrap";
import { playersDb } from "../api/db/connection";
import { buildUrl } from "osu-web.js";
import Link from "next/link";
import { auth } from "@/auth";
import { Filter } from "mongodb";
import { DbPlayer } from "@/types/database.player";
import Image from "next/image";
import ClickableTableRow from "@/components/ClickableTableRow";

export default async function Leaderboard() {
   const session = await auth();
   let adminFilter: Filter<DbPlayer> = { hideLeaderboard: { $exists: false } };
   const user = await playersDb.findOne({ osuid: session?.user.id });
   const gamemode = user?.gamemode || "osu";
   if (user && user.admin) adminFilter = {};
   const pvePlayers = await playersDb
      .find(
         {
            hideLeaderboard: { $ne: true },
            [`${gamemode}.pve.songs`]: { $gt: 10 },
            [`${gamemode}.pve.games`]: { $gt: 1 }
         },
         { sort: [`${gamemode}.pve.rating`, -1], limit: 100 }
      )
      .toArray();
   const pvpPlayers = await playersDb
      .find(
         {
            hideLeaderboard: { $ne: true },
            $or: [{ [`${gamemode}.pvp.wins`]: { $gt: 2 } }, { [`${gamemode}.pvp.losses`]: { $gt: 3 } }]
         },
         { sort: [`${gamemode}.pvp.rating`, -1], limit: 100 }
      )
      .toArray();

   return (
      <div className="d-flex gap-4 align-items-start">
         <Table className="table-hover table-striped flex-fill align-middle">
            <thead>
               <tr>
                  <th className="text-decoration-underline">1v1</th>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Rating</th>
                  <th>Games</th>
                  <th>Winrate</th>
               </tr>
            </thead>
            <tbody>
               {pvpPlayers.map((p, i) => (
                  <ClickableTableRow key={p.osuid} href={`/profile/${p.osuid}`}>
                     <td>
                        <Image
                           src={buildUrl.userAvatar(p.osuid)}
                           alt="Avatar"
                           width={32}
                           height={32}
                           className="rounded"
                        />
                     </td>
                     <td>#{i + 1}</td>
                     <td>{p.osuname}</td>
                     <td>{p[gamemode].pvp.rating.toFixed()}</td>
                     <td>{p[gamemode].pvp.wins + p[gamemode].pvp.losses}</td>
                     <td>
                        {(
                           (100 * p[gamemode].pvp.wins) /
                           (p[gamemode].pvp.wins + p[gamemode].pvp.losses)
                        ).toFixed()}
                        %
                     </td>
                  </ClickableTableRow>
               ))}
            </tbody>
         </Table>
         <Table className="table-hover table-striped flex-fill align-middle">
            <thead>
               <tr>
                  <th className="text-decoration-underline">PvE</th>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Rating</th>
                  <th>Lobbies</th>
                  <th>Playcount</th>
               </tr>
            </thead>
            <tbody>
               {pvePlayers.map((p, i) => (
                  <ClickableTableRow key={p.osuid} href={`/profile/${p.osuid}`}>
                     <td>
                        <Image
                           src={buildUrl.userAvatar(p.osuid)}
                           alt="Avatar"
                           width={32}
                           height={32}
                           className="rounded"
                        />
                     </td>
                     <td>#{i + 1}</td>
                     <td>{p.osuname}</td>
                     <td>{p[gamemode].pve.rating.toFixed()}</td>
                     <td>{p[gamemode].pve.games}</td>
                     <td>{p[gamemode].pve.songs}</td>
                  </ClickableTableRow>
               ))}
            </tbody>
         </Table>
      </div>
   );
}
