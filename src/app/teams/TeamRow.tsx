import { Team } from "@/types/database.team";
import Link from "next/link";
import { Button, Card, CardBody, CardTitle } from "react-bootstrap";
import PlayerCard from "./components/PlayerCard";

export default function TeamRow({ team }: { team: Team }) {
   return (
      <Card>
         <CardBody>
            <CardTitle className="d-flex justify-content-between">
               <span>{team.name}</span>
               <Link href={`/teams/${team._id}`}>
                  <Button>Details</Button>
               </Link>
            </CardTitle>
            <CardBody className="d-flex flex-wrap gap-1">
               {team.players.map(player => (
                  <PlayerCard key={player.id} player={player} />
               ))}
            </CardBody>
         </CardBody>
      </Card>
   );
}
