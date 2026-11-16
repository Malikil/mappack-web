"use server";

import db, { mapsDb, playersDb } from "@/database/connection";
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
import { getMaplistForPredictor } from "@/helpers/server/predictor";
import { fetchUpdatesForMode } from "@/app/api/cron/maps/functions";

export async function debug(): Promise<string> {
   return "";
}
