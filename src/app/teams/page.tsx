import { auth } from "@/auth";
import { playersDb, teamsDb } from "../api/db/connection";
import { redirect } from "next/navigation";
import { Button, Card, CardBody, CardHeader, CardTitle } from "react-bootstrap";
import { DbTeam } from "@/types/database.team";
import { revalidatePath } from "next/cache";
import TeamRow from "./TeamRow";

export default async function Teams() {
   const session = await auth();
   const player = await playersDb.findOne({ _id: session?.user.id });
   if (!session || !player) return redirect("/profile");

   // Get all the player's teams
   const teamList = await teamsDb.find({ "players.id": player._id }).toArray();
   const { activeTeams, pendingTeams } = teamList.reduce(
      (filter, current) => {
         if (current.players.find(p => p.id === player._id).pending) filter.pendingTeams.push(current);
         else filter.activeTeams.push(current);
         return filter;
      },
      { activeTeams: [] as DbTeam[], pendingTeams: [] as DbTeam[] }
   );
   return (
      <div className="d-flex flex-column gap-2">
         <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
               <span>Current Teams</span>
               <form
                  action={async () => {
                     "use server";
                     console.log("Create team");
                     await teamsDb.insertOne({
                        name: "New Team",
                        players: [
                           {
                              id: player._id,
                              osuname: player.osuname,
                              pending: false
                           }
                        ],
                        pools: []
                     });
                     revalidatePath("/teams");
                  }}
               >
                  <Button type="submit">Create Team</Button>
               </form>
            </CardHeader>
            <CardBody className="d-flex flex-column gap-1">
               {activeTeams.map(team => (
                  <TeamRow key={team.name} team={team} />
               ))}
            </CardBody>
         </Card>
         <Card>
            <CardHeader>Pending Invites</CardHeader>
            <CardBody className="d-flex gap-1 flex-wrap"></CardBody>
         </Card>
      </div>
   );
}
