import { Card, CardBody, CardHeader, CardImg, CardText, CardTitle } from "react-bootstrap";
import db from "../api/db/connection";
import { buildUrl } from "osu-web.js";

export default async function Leaderboard() {
   const playersDb = db.collection("players");
   const pvePlayers = await playersDb.find({}, { sort: ["pve.rating", -1], limit: 100 }).toArray();
   const pvpPlayers = await playersDb.find({}, { sort: ["pvp.rating", -1], limit: 100 }).toArray();

   return (
      <div className="d-flex gap-2">
         <Card className="flex-fill">
            <CardHeader>1v1 Matches</CardHeader>
            <CardBody
               className="gap-2"
               style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(128px,1fr))"
               }}
            >
               {pvpPlayers.map(p => (
                  <Card key={p.osuid}>
                     <CardImg src={buildUrl.userAvatar(p.osuid)} alt="Avatar" />
                     <CardBody>
                        <CardTitle>{p.osuname}</CardTitle>
                        <CardText>
                           <div>Rating: {p.pvp.rating.toFixed()}</div>
                           <div>
                              W/L: {p.pvp.wins}/{p.pvp.losses}
                           </div>
                        </CardText>
                     </CardBody>
                  </Card>
               ))}
            </CardBody>
         </Card>
         <Card className="flex-fill">
            <CardHeader>Score Attack</CardHeader>
            <CardBody
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
                           <div>Rating: {p.pve.rating.toFixed()}</div>
                           <div>Games: {p.pve.games}</div>
                        </CardText>
                     </CardBody>
                  </Card>
               ))}
            </CardBody>
         </Card>
      </div>
   );
}
