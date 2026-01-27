"use server";

import { mpLinksDb, playersDb } from "@/app/api/db/connection";
import { addMatchData, addTeamsData, parseMpLobby as parsePvp } from "@/app/api/db/pvp/functions";
import { register } from "@/app/api/db/register/functions";
import { createPvpRegistration } from "@/helpers/server/players";
import { submitPveData } from "@/helpers/server/pve";
import { MpLobbyResults } from "@/types/multiplayer";
import { LegacyClient } from "osu-web.js";

export async function adminPvp(formData: FormData) {
   const mpLink = formData.get("mp").toString();
   const warmups = parseInt(formData.get("warmup").toString()) || 0;
   const matchIdSegment = parseInt(mpLink.slice(mpLink.lastIndexOf("/") + 1));
   const lobbyResults = await parsePvp(matchIdSegment, warmups, true);
   if (!lobbyResults)
      return {
         http: {
            status: 400,
            message: "Invalid 1v1 match"
         }
      };
   try {
      await mpLinksDb.insertOne({ _id: matchIdSegment });
   } catch (err) {
      console.warn("Admin pvp add existing mp link");
      console.error(err);
      return {
         http: {
            status: 400,
            message: "MP link already added"
         }
      };
   }
   if (
      lobbyResults.winnerId === "Red" ||
      lobbyResults.winnerId === "Blue" ||
      lobbyResults.loserId === "Red" ||
      lobbyResults.loserId === "Blue"
   ) {
      await addTeamsData(lobbyResults);
      return;
   }
   // This point is only reached if lobbyResults is a 1v1
   // Verify registrations for both players
   const osuClient = new LegacyClient(process.env.OSU_LEGACY_KEY);
   const players = await playersDb
      .find({ $or: [{ _id: lobbyResults.winnerId }, { _id: lobbyResults.loserId }] })
      .toArray();
   for (const id of [lobbyResults.winnerId, lobbyResults.loserId]) {
      if (!players.find(p => p._id === id)) {
         const banchoPlayer = await osuClient.getUser({ u: id, m: lobbyResults.mode });
         await register(id, banchoPlayer.username);
         // Create pvp stats at the same time
         await createPvpRegistration(id, lobbyResults.mode);
      }
   }
   // Make sure both players have pvp stats
   for (const player of players)
      if (!("pvp" in player[lobbyResults.mode])) {
         await createPvpRegistration(player._id, lobbyResults.mode);
      }
   // Add the match results
   await addMatchData(lobbyResults as MpLobbyResults);
}

export async function adminPve(formData: FormData) {
   const mpLink = formData.get("mp").toString();
   const matchIdSegment = parseInt(mpLink.slice(mpLink.lastIndexOf("/") + 1));
   if (mpLinksDb.findOne({ _id: matchIdSegment }))
      return {
         http: {
            status: 400,
            message: "MP link already submitted"
         }
      };
   const success = await submitPveData(matchIdSegment, true);
   if (!success)
      return {
         http: {
            status: 400,
            message: "Failed to parse lobby"
         }
      };
   mpLinksDb.insertOne({ _id: matchIdSegment });
}
