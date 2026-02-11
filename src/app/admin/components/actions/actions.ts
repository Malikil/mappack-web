"use server";

import { fruitsDb, maniaDb, osuDb, playersDb, taikoDb } from "@/app/api/db/connection";
import { parse1v1Lobby } from "@/app/api/db/pvp/functions";
import { auth } from "@/auth";
import { getOsuToken } from "@/helpers/osuToken";
import { matchResultValue } from "@/helpers/rating-range";
import { getLobbyData } from "@/helpers/server/multiplayer";
import { convertTime, days, minutes } from "@/time";
import {
   MatchGame,
   MatchInfo,
   UndocumentedMatchDetails,
   UndocumentedMatches
} from "@/types/undocumented/matches";
import { Glicko2 } from "glicko2";
import { calcModStat, Client, GameMode, LegacyClient } from "osu-web.js";
import util from "util";

export async function debug() {
   const calculator = new Glicko2();
   const player = calculator.makePlayer(900, 350, 0.06);
   const map = calculator.makePlayer(1500, 150, 0.06);
   calculator.updateRatings([[player, map, matchResultValue(600000, "mania")]]);
   console.log(`Player rating: 900 => ${player.getRating().toFixed()}`);
   console.log(`Map rating: 1500 => ${map.getRating().toFixed()}`);
}
