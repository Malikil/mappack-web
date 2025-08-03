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
import { Player } from "glicko2";

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
         console.log([player.statistics_rulesets[mode].pp, dbPlayer[mode].pvp.rating].join(", "));
      }
   }
   const logReg = new PolynomialRegressor(1);
   logReg.fit(datasets.x, datasets.y);
   return logReg;
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

export async function debug() {
   await getPlayerRatingScalings("osu");
   // const { matches, maps } = await parseMpLobby(118694524);
   // const maplist = await mapsDb
   //    .find({ $or: maps })
   //    .map<{ map: DbBeatmap; ratings: Partial<Record<SimpleMod, Player>> }>(map => ({ map, ratings: {} }))
   //    .toArray();
   // // Get map info for any maps not in the database
   // const missing = maps.filter(
   //    m => !maplist.find(exist => exist.map.id === m.id && exist.map.mode === m.mode)
   // );
   // console.log("missing", missing);
   // if (missing.length > 0)
   //    maplist.push(
   //       ...(await addMapsToDatabase(await getOsuToken(), missing).then(dblist =>
   //          dblist.map(dbmap => ({ map: dbmap, ratings: {} }))
   //       ))
   //    );
   // Object.keys(matches).forEach(playerIdStr => {
   //    const matchInfo = matches[playerIdStr];
   //    matchInfo.forEach(score => {
   //       const mapInfo = maplist.find(m => m.map.id === score.map && m.map.mode === score.mode);
   //       // If the map isn't in the list, ignore it
   //       if (!mapInfo) return;
   //       // Set the map info on the parser
   //       score.score.setMap(mapInfo.map);
   //       // If parsing the score fails, also skip the map
   //       console.log(playerIdStr, mapInfo.map.title, score.score.getScore());
   //    });
   // });
   // const newestPack = await mappacksDb.findOne({ mode: "taiko", active: "pending" });
   // const result = await mapsDb.deleteMany({ mode: "taiko", id: { $in: newestPack.maps } });
   // console.log(result);
   // Get recent beatmap packs
   // const packs = await client.getUndocumented<UndocumentedBeatmappackResponse>("beatmaps/packs");
   // console.log(packs.beatmap_packs.slice(0, 3), `+ ${packs.beatmap_packs.length - 3} more`);
   // const mappackTag = await findMappackTag(packs.beatmap_packs, "taiko");
   // console.log(`Found mappack ${mappackTag}`);
   // const mappack = await client.getUndocumented<UndocumentedBeatmappack>(`beatmaps/packs/${mappackTag}`);
   // console.log(`Add mappack ${mappack.tag}`);
   // await createMappool(
   //    accessToken,
   //    mappack.name,
   //    mappack.url,
   //    mappack.beatmapsets.map(bms => bms.id),
   //    "taiko"
   // );
   // const reg = await getPlayerRatingScalings("osu");
   // const names = ["AsheBradley", "Syaro", "pedrogc219", "Dishh", "NikoN1nja", "Omutatsu_"];
   // const ranks = [6570, 8204, 4578, 7609, 7289, 4989];
   // const predictions = reg.predict(ranks.map(v => [Math.log(v)]));
   // for (let i = 0; i < names.length; i++) console.log(names[i], ranks[i], predictions[i][0]);
}
