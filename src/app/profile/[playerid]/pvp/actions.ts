"use server";

import { revalidatePath } from "next/cache";
import { addMatchData, createPvpRegistration, parseMpLobby } from "@/app/api/db/pvp/functions";
import { GameMode, LegacyClient } from "osu-web.js";
import { mpLinksDb, playersDb } from "@/app/api/db/connection";
import { redirect } from "next/navigation";
import { register } from "@/app/api/db/register/functions";
import { auth } from "@/auth";

export async function getOpponentMappool(userid: number, formData: FormData) {
   const opp = formData.get("opponent") as string;
   const player = await playersDb.findOne({ osuid: userid });
   const opponent = await playersDb.findOne({
      $or: [{ osuid: parseInt(opp) }, { osuname: opp }]
   });
   return redirect(`/mappool/${userid}/${opponent?.osuid || ""}?m=${player.gamemode || "osu"}`);
}

export async function createPvp(userid: number, gamemode: GameMode) {
   const osu = new LegacyClient(process.env.OSU_LEGACY_KEY);
   const osuUser = await osu.getUser({ u: userid, m: gamemode });
   await createPvpRegistration(userid, osuUser.pp_raw, gamemode);
   revalidatePath(`/profile/${userid}`);
}

export async function submitPvp(formData: FormData) {
   const session = await auth();
   const mpLink = formData.get("mp").toString();
   const warmups = parseInt(formData.get("warmup").toString()) || 0;
   const matchIdSegment = parseInt(mpLink.slice(mpLink.lastIndexOf("/") + 1));
   if (await mpLinksDb.findOne({ _id: matchIdSegment }))
      return {
         http: {
            status: 400,
            message: "MP link already submitted"
         }
      };
   const lobbyResults = await parseMpLobby(matchIdSegment, warmups);
   if (!lobbyResults)
      return {
         http: {
            status: 400,
            message: "Invalid 1v1 match"
         }
      };
   // Only allow matches the submitter was a part of
   if (session.user.id !== lobbyResults.winnerId && session.user.id !== lobbyResults.loserId)
      return {
         http: {
            status: 400,
            message: "Please only submit matches where you were a player"
         }
      };
   await mpLinksDb.insertOne({ _id: matchIdSegment });
   // Verify registrations for both players
   const osuClient = new LegacyClient(process.env.OSU_LEGACY_KEY);
   const players = await playersDb
      .find({ $or: [{ osuid: lobbyResults.winnerId }, { osuid: lobbyResults.loserId }] })
      .toArray();
   for (const id of [lobbyResults.winnerId, lobbyResults.loserId]) {
      if (!players.find(p => p.osuid === id)) {
         const banchoPlayer = await osuClient.getUser({ u: id, m: lobbyResults.mode });
         await register(id, banchoPlayer.username);
         // Create pvp stats at the same time
         await createPvpRegistration(id, banchoPlayer.pp_raw, lobbyResults.mode);
      }
   }
   // Make sure both players have pvp stats
   for (const player of players)
      if (!("pvp" in player[lobbyResults.mode])) {
         const banchoPlayer = await osuClient.getUser({ u: player.osuid, m: lobbyResults.mode });
         await createPvpRegistration(player.osuid, banchoPlayer.pp_raw, lobbyResults.mode);
      }
   // Add the match results
   await addMatchData(lobbyResults);

   revalidatePath("/profile");
}
