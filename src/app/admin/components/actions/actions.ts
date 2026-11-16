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

/*
{
  _id: NumberInt('4744558'),
  setid: NumberInt('2233814'),
  artist: 'monoqlom',
  title: 'tatari',
  version: 'cursed oni',
  mapper: 'Genjuro',
  length: NumberInt('190'),
  bpm: NumberInt('290'),
  od: NumberInt('8'),
  stars: Double('9.02'),
  noteCount: {
    circles: NumberInt('2156'),
    sliders: NumberInt('1')
  },
  maxCombo: NumberInt('2156'),
  styles: [
    Double('-0.008169448851993456'),
    Double('0.006170996883160152'),
    Double('0.007374599677198305'),
    Double('0.004836441090370163'),
    Double('0.007602607291618662'),
    Double('0.005568361455702114')
  ],
  rating: {
    rating: Double('2163.68'),
    rd: Double('56.74740495098629'),
    vol: Double('0.05999327072200994')
  },
  mods: {
    HD: Double('1.04'),
    HR: Double('1.04'),
    DT: Double('1.09')
  }
}

export interface DbBeatmapBase {
   _id: number;
   setid: number;
   version: string;
   length: number;
   bpm: number;
   artist: string;
   title: string;
   mapper: string;
   maxCombo: number;
   noteCount: {
      circles: number;
      sliders: number;
   };
   lastQuery: Date;
   styles: number[];
   mods: ModRatings;
   rating: Rating;
   ranked: number;
}
export interface TaikoBeatmap extends DbBeatmapBase {
   od: number;
   stars: {
      nm: number;
      hr: number;
      dt: number;
   };
}
*/

export async function debug() {
   // Done: osu, fruits, taiko
   // Set maps which the predictor uses to a very old date
   // const lastQuery = new Date();
   // lastQuery.setFullYear(lastQuery.getFullYear() - 1);
   // const maps = await getMaplistForPredictor("mania").toArray();
   // console.log(maps.length);
   // await mapsDb.mania.updateMany({ _id: { $in: maps.map(m => m._id) } }, { $set: { lastQuery } });
   // // Use the existing updater
   // const cutoff = new Date();
   // cutoff.setFullYear(cutoff.getFullYear() - 1);
   // cutoff.setDate(cutoff.getDate() + 1);
   // const client = new Client(await getOsuToken());
   // for (let updateCount = 0; updateCount <= 1000; ) {
   //    const batchResult = await fetchUpdatesForMode("mania", cutoff, client, mapsDb.mania);
   //    console.log((updateCount += batchResult));
   //    if (batchResult < 1) break;
   //    await new Promise(res => setTimeout(res, 400));
   // }
}
