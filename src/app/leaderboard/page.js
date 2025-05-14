import { Card, CardBody, CardHeader, CardImg, CardText, CardTitle } from "react-bootstrap";
import db from "../api/db/connection";
import { buildUrl } from "osu-web.js";
import Link from "next/link";
import { auth } from "@/auth";

export default async function Leaderboard() {
   const session = await auth();
   let adminFilter = { hideLeaderboard: { $exists: false } };
   const playersDb = db.collection("players");
   const user = await playersDb.findOne({ osuid: session?.user.id });
   const gamemode = user?.gamemode || "osu";
   if (user && user.admin) adminFilter = {};
   const pvePlayers = await playersDb
      .find(
         {
            ...adminFilter,
            [`${gamemode}.pve.games`]: { $gt: 0 }
         },
         { sort: [`${gamemode}.pve.rating`, -1], limit: 100 }
      )
      .toArray();
   const pvpPlayers = await playersDb
      .find(
         {
            ...adminFilter,
            [`${gamemode}.pvp`]: { $exists: true }
         },
         { sort: [`${gamemode}.pvp.rating`, -1], limit: 100 }
      )
      .toArray();

   return (
      <div className="d-flex gap-2">
         <Card className="flex-fill">
            <CardHeader>1v1 Matches</CardHeader>
            <CardBody>
               <div
                  className="gap-2"
                  style={{
                     display: "grid",
                     gridTemplateColumns: "repeat(auto-fit,minmax(128px,1fr))"
                  }}
               >
                  {pvpPlayers.map(p => (
                     <Link
                        key={p.osuid}
                        href={`/profile/${p.osuid}`}
                        className="text-decoration-none"
                     >
                        <Card>
                           <CardImg src={buildUrl.userAvatar(p.osuid)} alt="Avatar" />
                           <CardBody>
                              <CardTitle>{p.osuname}</CardTitle>
                              <CardText>
                                 Rating: {p[gamemode].pvp.rating.toFixed()}
                                 <br />
                                 W/L: {p[gamemode].pvp.wins} - {p[gamemode].pvp.losses}
                              </CardText>
                           </CardBody>
                        </Card>
                     </Link>
                  ))}
               </div>
            </CardBody>
         </Card>
         <Card className="flex-fill">
            <CardHeader>Score Attack</CardHeader>
            <CardBody>
               <div
                  className="gap-2"
                  style={{
                     display: "grid",
                     gridTemplateColumns: "repeat(auto-fit,minmax(128px,1fr))"
                  }}
               >
                  {pvePlayers.map(p => (
                     <Link
                        key={p.osuid}
                        href={`/profile/${p.osuid}`}
                        className="text-decoration-none"
                     >
                        <Card>
                           <CardImg src={buildUrl.userAvatar(p.osuid)} alt="Avatar" />
                           <CardBody>
                              <CardTitle>{p.osuname}</CardTitle>
                              <CardText>
                                 Rating: {p[gamemode].pve.rating.toFixed()}
                                 <br />
                                 Games: {p[gamemode].pve.games}
                              </CardText>
                           </CardBody>
                        </Card>
                     </Link>
                  ))}
               </div>
            </CardBody>
         </Card>
      </div>
   );
}
