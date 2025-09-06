"use server";

import { historyDb, mpLinksDb, playersDb } from "@/app/api/db/connection";
import { addMatchData, createPvpRegistration, parseMpLobby as parsePvp } from "@/app/api/db/pvp/functions";
import { register } from "@/app/api/db/register/functions";
import { parseMpLobby as parsePve, submitPveData } from "@/app/profile/[playerid]/pve/functions";
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
   await mpLinksDb.insertOne({ _id: matchIdSegment }).catch(err => {
      console.warn("Admin pvp add existing mp link");
      console.warn(err);
   });
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
}

export async function adminPve(formData: FormData) {
   const mpLink = formData.get("mp").toString();
   const matchIdSegment = parseInt(mpLink.slice(mpLink.lastIndexOf("/") + 1));
   const data = await parsePve(matchIdSegment, true);
   if (!data)
      return {
         http: {
            status: 400,
            message: "Failed to parse lobby"
         }
      };
   if (Object.keys(data.matches).length < 1)
      return {
         http: {
            status: 400,
            message: "No songs found"
         }
      };
   console.log(data.matches);
   try {
      await submitPveData(data);
      // Add the mp link to history
      mpLinksDb.insertOne({ _id: matchIdSegment }).catch(err => {
         console.warn("Admin pve add existing mp link");
         console.warn(err);
      });
   } catch (err) {
      console.warn(err);
      return {
         http: {
            status: 500,
            message: "Failed to fetch player information"
         }
      };
   }
}
