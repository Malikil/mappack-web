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
import { DbPlayer } from "@/types/database.player";
import { OsuBeatmap } from "@/types/database/beatmap";

export async function debug(): Promise<string> {
   const players = playersDb.aggregate<DbPlayer>([{ $sample: { size: 7000 } }]);
   const maps = await mapsDb.osu.aggregate<OsuBeatmap>([{ $sample: { size: 10000 } }]).toArray();
   const vals = {
      min: Number.MAX_SAFE_INTEGER,
      max: Number.MIN_SAFE_INTEGER,
      var: 0,
      mean: 0
   };
   const dots: number[] = [];
   for await (const player of players) {
      for (const map of maps) {
         let dot = 0;
         for (let i = 0; i < player.osu.styles.length; i++) {
            dot += player.osu.styles[i] * map.styles[i];
         }
         vals.min = Math.min(vals.min, dot);
         vals.max = Math.max(vals.max, dot);
         vals.mean += dot;
         dots.push(dot);
      }
   }
   vals.mean /= dots.length;
   for (const dot of dots) vals.var += (dot - vals.mean) * (dot - vals.mean);
   vals.var /= dots.length - 1;

   return JSON.stringify(vals, undefined, 2);
}
