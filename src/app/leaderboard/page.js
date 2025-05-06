import { Card, CardBody, CardHeader, CardImg, CardText, CardTitle } from "react-bootstrap";
import db from "../api/db/connection";
import { buildUrl } from "osu-web.js";
import { verify } from "../admin/functions";
import Link from "next/link";

export default async function Leaderboard() {
   const adminFilter = (await verify()).session
      ? {}
      : { $or: [{ hideLeaderboard: { $exists: false } }, { hideLeaderboard: false }] };
   const playersDb = db.collection("players");
   const pvePlayers = await playersDb
      .find(
         {
            ...adminFilter,
            "pve.games": { $gt: 0 }
         },
         { sort: ["pve.rating", -1], limit: 100 }
      )
      .toArray();
   const pvpPlayers = await playersDb
      .find(
         {
            $and: [adminFilter, { $or: [{ "pvp.wins": { $gt: 0 } }, { "pvp.losses": { $gt: 0 } }] }]
         },
         { sort: ["pvp.rating", -1], limit: 100 }
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
                                 Rating: {p.pvp.rating.toFixed()}
                                 <br />
                                 W/L: {p.pvp.wins} - {p.pvp.losses}
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
                     <Card key={p.osuid}>
                        <CardImg src={buildUrl.userAvatar(p.osuid)} alt="Avatar" />
                        <CardBody>
                           <CardTitle>{p.osuname}</CardTitle>
                           <CardText>
                              Rating: {p.pve.rating.toFixed()}
                              <br />
                              Games: {p.pve.games}
                           </CardText>
                        </CardBody>
                     </Card>
                  ))}
               </div>
            </CardBody>
         </Card>
      </div>
   );
}
