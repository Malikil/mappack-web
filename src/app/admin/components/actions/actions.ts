"use server";

import { fruitsDb, maniaDb, osuDb, taikoDb } from "@/app/api/db/connection";
import { parse1v1Lobby } from "@/app/api/db/pvp/functions";
import { getOsuToken } from "@/helpers/osuToken";
import { getLobbyData } from "@/helpers/server/multiplayer";
import { convertTime, minutes } from "@/time";
import {
   MatchGame,
   MatchInfo,
   UndocumentedMatchDetails,
   UndocumentedMatches
} from "@/types/undocumented/matches";
import { Glicko2 } from "glicko2";
import { Client, LegacyClient } from "osu-web.js";
import util from "util";

export async function debug() {
   const client = new Client(await getOsuToken());
   const matches = await client.getUndocumented<UndocumentedMatches>("matches", {
      query: { active: "false" }
   });

   const filtered: MatchInfo[] = matches.matches
      .map(m => ({
         ...m,
         start_time: new Date(m.start_time),
         end_time: new Date(m.end_time)
      }))
      .filter(m => m.end_time.getTime() - m.start_time.getTime() > minutes(10));
   const matchType = {
      tourney: [] as MatchInfo[],
      lobby: [] as MatchInfo[]
   };
   filtered.forEach(m => {
      console.log(m.id, convertTime((m.end_time.getTime() - m.start_time.getTime()) / 1000), m.name);
      if (m.name.match(/^.+?: \(.+?\) vs \(.+?\)$/)) matchType.tourney.push(m);
      else matchType.lobby.push(m);
   });
   console.log(matchType);
   // if (matchType.tourney.length > 0) getLobbyData(matchType.tourney[0].id, client);
   // else getLobbyData(matchType.lobby[0].id, client);
   const lobbies: (UndocumentedMatchDetails & { games: MatchGame[] })[] = [];
   for (const match of filtered) {
      const lobby = await getLobbyData(match.id, client);
      if (lobby.games.length > 0) lobbies.push(lobby);
   }
   console.log(lobbies);
   console.log(lobbies.length);
   //getLobbyData(119991033, client);
}

