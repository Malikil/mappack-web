"use server";

import { mappacksDb, mapsDb, playersDb } from "@/app/api/db/connection";
import { addMatchData } from "@/app/api/db/pvp/functions";
import { addMapsToDatabase, createMappool, cyclePools } from "@/helpers/addPool";
import { getCurrentPack } from "@/helpers/currentPack";
import { batchCursor } from "@/helpers/list-splitter";
import { getOsuToken } from "@/helpers/osuToken";
import { convertPP } from "@/helpers/rankPredictor";
import { delay } from "@/time";
import { DbBeatmap } from "@/types/database.beatmap";
import { DbMappack, MappackActiveState } from "@/types/database.mappack";
import { PolynomialRegressor } from "@rainij/polynomial-regression-js";
import { Client, GameMode, LegacyClient } from "osu-web.js";

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

async function getPlayerRatingScalings(mode: GameMode) {
   console.log("Get player rating scalings");
   const osuClient = new Client(await getOsuToken());
   const playerList = playersDb.find({ [`${mode}.pvp`]: { $exists: true } });
   const datasets = { x: [] as number[][], y: [] as number[][] };
   for await (const playerGroups of batchCursor(playerList)) {
      // Get player ratings
      const playersStats = await osuClient.users.getUsers({ query: { ids: playerGroups.map(p => p.osuid) } });
      for (const player of playersStats) {
         const dbPlayer = playerGroups.find(p => p.osuid === player.id);
         datasets.x.push([Math.log(player.statistics_rulesets[mode].pp)]);
         datasets.y.push([dbPlayer[mode].pvp.rating]);
      }
   }
   const logReg = new PolynomialRegressor(1);
   logReg.fit(datasets.x, datasets.y);
   return logReg;
}

export async function debug() {
   const reg = await getPlayerRatingScalings("osu");
   const names = ["AsheBradley", "Syaro", "pedrogc219", "Dishh", "NikoN1nja", "Omutatsu_"];
   const ranks = [6570, 8204, 4578, 7609, 7289, 4989];
   const predictions = reg.predict(ranks.map(v => [Math.log(v)]));
   for (let i = 0; i < names.length; i++) console.log(names[i], ranks[i], predictions[i][0]);
}
