"use server";

import { parseMpLobby as parsePvp, addMatchData as addPvp } from '@/app/api/db/pvp/functions';
import { parseMpLobby as parsePve, submitPveData } from '@/app/profile/[playerid]/pve/functions';
import { PveLobbyResults } from '@/types/multiplayer';
import { GameMode } from 'osu-web.js';

export async function submitTournamentStage(formData: FormData) {
   const type = formData.get("submitType").toString();
   if (type === "pvp")
      return {
         http: {
            message: "Not implemented",
            status: 501
         }
      };
   console.log(`Submit stage links as ${type}`);
   const mpLinks = formData
      .get("mp")
      .toString()
      .split("\n")
      .map(s => s.trim())
      .filter(s => s);
   console.log(mpLinks);
   const results: Omit<PveLobbyResults, "mp"> & { mp: { [userid: number]: number } } = {
      matches: {},
      maps: {},
      mp: {}
   };
   for (const link of mpLinks) {
      const mp = parseInt(link.slice(link.lastIndexOf("/") + 1));
      console.log(`Lobby ${mp}`);
      const lobbyResult = await parsePve(mp);
      console.log("Done");
      Object.entries(lobbyResult.matches).forEach(([playerIdStr, playerResults]) => {
         const playerId = parseInt(playerIdStr);
         if (playerId in results.matches) results.matches[playerId].push(...playerResults);
         else results.matches[playerId] = playerResults;
         results.mp[playerId] = mp;
      });
      Object.entries(lobbyResult.maps).forEach(([mode, maplist]) => {
         const set = results.maps[mode as GameMode] || new Set();
         maplist.forEach(n => set.add(n));
         results.maps[mode as GameMode] = set;
      });
   }
   console.log(results);
   //await submitPveData(results);
}
