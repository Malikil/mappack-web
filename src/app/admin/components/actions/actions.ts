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
   const modes: GameMode[] = ["osu", "fruits", "taiko", "mania"];
   const result = await playersDb.updateMany(
      {
         admin: { $ne: true },
         $and: modes.flatMap(mode => [
            { [`${mode}.pve.rd`]: 350 },
            {
               $or: [{ [`${mode}.pvp`]: { $exists: false } }, { [`${mode}.pvp.rd`]: 350 }]
            }
         ])
      },
      { $set: { delPreview: true } }
   );

   console.log(result);
}
