import { teamsDb } from "../api/db/connection";
import { ObjectId } from "mongodb";

export async function removePlayer(playerId: number, teamId: string) {
   const _id = ObjectId.createFromHexString(teamId);

   const team = await teamsDb.findOneAndUpdate(
      { _id },
      {
         $pull: { players: { id: playerId } },
         $unset: {
            [`pools.$[].maps.$[].scores.${playerId}`]: ''
         }
      },
      { returnDocument: "after" }
   );
   if (team.players.filter(p => !p.pending).length < 1) {
      const result = await teamsDb.deleteOne({ _id });
      console.log(result);
   }
}
