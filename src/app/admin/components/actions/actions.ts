"use server";

import { parse1v1Lobby } from "@/app/api/db/pvp/functions";
import { LegacyClient } from "osu-web.js";
import util from "util";

export async function debug() {
   const mpId = 120093774;
   const client = new LegacyClient(process.env.OSU_LEGACY_KEY);
   const lobby = await client.getMultiplayerLobby({ mp: mpId });
   const lobbyResults = parse1v1Lobby(lobby, 0);
   console.log(util.inspect(lobbyResults, { depth: 4, colors: true }));
}
