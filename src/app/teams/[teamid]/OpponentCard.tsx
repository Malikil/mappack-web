"use client";

import { serverActionToast } from "@/toaster";
import Link from "next/link";
import { buildUrl } from "osu-web.js";
import { Button, Card, CardBody, CardImg, CardTitle } from "react-bootstrap";
import { removeOpponent } from "./actions";

export default function OpponentCard({
   player,
   teamId
}: {
   player: { id: number; osuname: string };
   teamId: string;
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
         <CardBody className="d-flex justify-content-between gap-2">
            <CardTitle>{player.osuname}</CardTitle>
            <Button
               size="sm"
               variant="danger"
               onClick={() =>
                  serverActionToast(removeOpponent(player.id, teamId), {
                     pending: "Removing",
                     success: "Removed"
                  })
               }
            >
               x
            </Button>
         </CardBody>
      </Card>
   );
}
