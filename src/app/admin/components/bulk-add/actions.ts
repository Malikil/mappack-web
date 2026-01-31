"use server";

import { mpLinksDb, playersDb } from "@/app/api/db/connection";
import {
   parseMpLobby as parsePvp,
   addMatchData as add1v1Match,
   addTeamsData
} from "@/app/api/db/pvp/functions";
import { register } from "@/app/api/db/register/functions";
import { auth, checkExpiry } from "@/auth";
import { getLobbyData } from "@/helpers/server/multiplayer";
import { createPvpRegistration } from "@/helpers/server/players";
import { submitPveData } from "@/helpers/server/pve";
import { delay, seconds } from "@/time";
import { MpLobbyResults } from "@/types/multiplayer";
import { Client, LegacyClient } from "osu-web.js";

export async function submitTournamentStage(formData: FormData) {
   const session = await auth();
   if (!session || checkExpiry(session.accessToken))
      return {
         http: {
            status: 400,
            message: "Access token expired"
         }
      };
   const client = new Client(session.accessToken);
   const type = formData.get("submitType").toString();
   console.log(`Submit stage links as ${type}`);
   const mpLinks = formData
      .get("mp")
      .toString()
      .split("\n")
      .map(s => s.trim())
      .filter(s => s);
   console.log(mpLinks);
   const parsedLinks = mpLinks
      .map(l => parseInt(l.slice(l.lastIndexOf("/") + 1)))
      .filter(v => v)
      .sort((a, b) => a - b);
   if (type === "pvp")
      for (const mp of parsedLinks) {
         console.log(`Match ${mp}`);
         if (await mpLinksDb.findOne({ _id: mp })) {
            console.log("Match already exists");
            continue;
         }
         const lobbyResult = await parsePvp(mp);
         if (!lobbyResult) {
            console.warn(mp, "Invalid match");
            continue;
         }
         await delay(seconds(0.5));
         if (
            lobbyResult.winnerId === "Red" ||
            lobbyResult.winnerId === "Blue" ||
            lobbyResult.loserId === "Red" ||
            lobbyResult.loserId === "Blue"
         ) {
            console.log(mp, "Add teams data");
            await addTeamsData(lobbyResult);
            await mpLinksDb.insertOne({ _id: mp });
            continue;
         }
         // This point is only reached if lobbyResults is a 1v1
         // Verify registrations for both players
         console.log(mp, "Prep players for 1v1");
         const osuClient = new LegacyClient(process.env.OSU_LEGACY_KEY);
         const players = await playersDb
            .find({ $or: [{ _id: lobbyResult.winnerId }, { _id: lobbyResult.loserId }] })
            .toArray();
         for (const id of [lobbyResult.winnerId, lobbyResult.loserId]) {
            if (!players.find(p => p._id === id)) {
               const banchoPlayer = await osuClient.getUser({ u: id, m: lobbyResult.mode });
               await register(id, banchoPlayer.username);
               // Create pvp stats at the same time
               await createPvpRegistration(id, lobbyResult.mode);
            }
         }
         // Make sure both players have pvp stats
         for (const player of players)
            if (!("pvp" in player[lobbyResult.mode])) {
               await createPvpRegistration(player._id, lobbyResult.mode);
            }
         // Add the match results
         console.log(mp, "Add 1v1 data");
         await add1v1Match(lobbyResult as MpLobbyResults);
         await mpLinksDb.insertOne({ _id: mp });
      }
   // PvE submit
   else
      for (const mp of parsedLinks) {
         console.log(`Lobby ${mp}`);
         if (await mpLinksDb.findOne({ _id: mp })) {
            console.log("Lobby already exists");
            continue;
         }
         console.log(`Submit ${mp}...`);
         const lobby = await getLobbyData(mp, client);
         await submitPveData(lobby);
         console.log("Done");
         await mpLinksDb.insertOne({ _id: mp });
         await delay(seconds(0.5));
      }
}
