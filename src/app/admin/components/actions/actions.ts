"use server";

import { fruitsDb, maniaDb, osuDb, taikoDb } from "@/app/api/db/connection";
import { parse1v1Lobby } from "@/app/api/db/pvp/functions";
import { auth } from "@/auth";
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
   const session = await auth();
   const client = new Client(session.accessToken);
   const lobby = await getLobbyData(120437488, client);
   console.log(lobby);
   //getLobbyData(119991033, client);
}

