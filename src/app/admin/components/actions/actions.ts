"use server";

import util from "util";
import { historyDb, mappacksDb, mapsDb, playersDb } from "@/app/api/db/connection";
import { addMatchData } from "@/app/api/db/pvp/functions";
import { addMapsToDatabase, createMappool, cyclePools } from "@/helpers/addPool";
import { getCurrentPack } from "@/helpers/currentPack";
import { batchArray, batchCursor } from "@/helpers/list-splitter";
import { getOsuToken } from "@/helpers/osuToken";
import { convertPP } from "@/helpers/rankPredictor";
import { ScoreParser } from "@/helpers/scorev1";
import { delay } from "@/time";
import { DbBeatmap } from "@/types/database.beatmap";
import { DbHistory } from "@/types/database.history";
import { DbMappack, MappackActiveState } from "@/types/database.mappack";
import { DbPlayer } from "@/types/database.player";
import {
   UndocumentedBeatmappack,
   UndocumentedBeatmappackCompact,
   UndocumentedBeatmappackResponse
} from "@/types/undocumented.beatmappacks";
import { PolynomialRegressor } from "@rainij/polynomial-regression-js";
import { Filter, UpdateFilter, UpdateOneModel } from "mongodb";
import { Client, GameMode, LegacyClient, LegacyMatchScore } from "osu-web.js";
import { parseMpLobby } from "@/app/profile/[playerid]/pve/functions";
import { SimpleMod } from "@/types/rating";
import { Glicko2, Player } from "glicko2";

async function getPreviousMapScalings(mode: GameMode) {
   console.log("Get previous map scalings");
   const maplist = mappacksDb.aggregate<Omit<DbMappack, "maps"> & { maps: DbBeatmap[] }>([
      { $match: { mode } },
      {
         $lookup: {
            from: "maps",
            localField: "maps",
            foreignField: "id",
            pipeline: [{ $match: { mode } }],
            as: "maps"
         }
      }
   ]);
   const datasets = { x: [] as number[][], y: [] as number[][] };
   for await (const pool of maplist) {
      pool.maps.forEach(map => {
         const { nm, hd, hr, dt } = map.ratings;
         datasets.x.push([map.stars, map.length, map.bpm, map.ar, map.cs]);
         datasets.y.push([nm.rating, hd.rating, hr.rating, dt.rating]);
      });
   }
   const polyReg = new PolynomialRegressor(2);
   polyReg.fit(datasets.x, datasets.y);
   return polyReg;
}

async function findMappackTag(packList: UndocumentedBeatmappackCompact[], mode: GameMode) {
   const history = (await historyDb.findOne({ _id: `${mode}Packs` })) as DbHistory & { type: "string" };
   const modeMapping = {
      osu: null,
      taiko: 1,
      fruits: 2,
      mania: 3
   };
   // Find the latest pack first
   const pack = packList.find(p => p.ruleset_id == modeMapping[mode]);
   if (history.items.includes(pack.name)) {
      // Find the highest number that's not on history
      const numberIndex = pack.name.lastIndexOf("#");
      let i = parseInt(pack.name.slice(numberIndex + 1)) - 1;
      while (history.items.includes(`${pack.name.slice(0, numberIndex)}#${i}`)) i--;
      // Construct the appropriate tag
      const modeTag = {
         osu: "",
         taiko: "T",
         fruits: "C",
         mania: "M"
      };
      return `S${modeTag[mode]}${i}`;
   } else return pack.tag;
}

function predictScore(player: Player, map: Player) {
   const predictedOutcome = player.predict(map);
   const max = 900000;
   const min = 500000;
   return predictedOutcome * (max - min) + min;
}

export async function debug() {
   const mp = 118941892;
   const playerid = 3208718;
   const { matches, maps } = await parseMpLobby(mp);
   const maplist = await mapsDb.find({ $or: maps }).toArray();
   const player = await playersDb.findOne({ osuid: playerid });
   const myResults = matches[playerid];
   const calculator = new Glicko2();
   const pcalc = calculator.makePlayer(player.fruits.pve.rating, player.fruits.pve.rd, player.fruits.pve.vol);
   const performance = myResults
      .map(result => {
         const map = maplist.find(m => m.id === result.map);
         result.score.setMap(map);
         const modRating = map.ratings[result.mod];
         const mapcalc = calculator.makePlayer(modRating.rating, modRating.rd, modRating.vol);
         const predictedScore = predictScore(pcalc, mapcalc);
         const actualScore = result.score.getScore();
         const jointRd = Math.sqrt(
            map.ratings[result.mod].rd * map.ratings[result.mod].rd +
               player.fruits.pve.rd * player.fruits.pve.rd
         );
         // How many deviations above the predicted score?
         const rdDiff = (actualScore - predictedScore) / jointRd;
         return { map, result, performance: rdDiff };
      })
      .filter(p => p.performance > 0)
      .sort((a, b) => b.performance - a.performance);
   console.log(performance);
}
