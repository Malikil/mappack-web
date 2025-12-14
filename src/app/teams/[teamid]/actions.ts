"use server";

import { teamsDb } from "@/app/api/db/connection";
import { auth } from "@/auth";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { removePlayer } from "../functions";
import { getPlayerList } from "@/helpers/server/players";
import { GameMode } from "osu-web.js";

export async function updateTeam(
   teamId: string,
   { teamName, gameMode, teamSize }: { teamName: string; gameMode: GameMode; teamSize: number }
) {
   console.log("Update team name");
   const result = await teamsDb.updateOne(
      { _id: ObjectId.createFromHexString(teamId) },
      { $set: { name: teamName, mode: gameMode, teamSize } }
   );
   console.log(result);
}

export async function invitePlayer(formData: FormData, teamId: string) {
   console.log("Invite player", formData);
   const playerField = formData.get("player").toString();
   const inviteId = parseInt(playerField.slice(playerField.lastIndexOf("/") + 1));
   const [invitePlayer] = await getPlayerList([inviteId]);
   //const invitePlayer = await playersDb.findOne({ _id: inviteId });
   if (!invitePlayer) return { http: { status: 400, message: "Unknown player" } };
   const result = await teamsDb.updateOne(
      { _id: ObjectId.createFromHexString(teamId), "players.id": { $ne: inviteId } },
      {
         $push: {
            players: {
               id: invitePlayer._id,
               osuname: invitePlayer.osuname,
               pending: true
            }
         }
      }
   );
   console.log(result);

   revalidatePath(`/teams/${teamId}`);
}

export async function leaveTeam(teamId: string) {
   const session = await auth();
   if (!session?.user.id) throw new Error("401");
   console.log("Leave team", session.user.id, teamId);

   await removePlayer(session.user.id, teamId);

   revalidatePath("/teams");
   redirect("/teams");
}
