import Link from "next/link";
import { buildUrl } from "osu-web.js";
import { Card, CardBody, CardImg, CardSubtitle, CardTitle } from "react-bootstrap";

export default function PlayerCard({
   player
}: {
   player: { id: number; osuname: string; pending?: boolean };
}) {
   return (
      <Card>
         <Link href={`/profile/${player.id}`}>
            <CardImg
               src={buildUrl.userAvatar(player.id)}
               alt="Avatar"
               style={{ maxHeight: "175px", objectFit: "contain" }}
            />
         </Link>
         <CardBody>
            <CardTitle>{player.osuname}</CardTitle>
            {player.pending && <CardSubtitle>Invite Pending</CardSubtitle>}
         </CardBody>
      </Card>
   );
}
