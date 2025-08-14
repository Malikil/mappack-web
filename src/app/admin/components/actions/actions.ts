"use server";

import util from "util";
import db, { historyDb, maniaDb, playersDb, taikoDb } from "@/app/api/db/connection";
import { batchCursor } from "@/helpers/list-splitter";
import { getOsuToken } from "@/helpers/osuToken";
import { DbHistory } from "@/types/database.history";
import { UndocumentedBeatmappackCompact } from "@/types/undocumented.beatmappacks";
import { PolynomialRegressor } from "@rainij/polynomial-regression-js";
import { Client, GameMode } from "osu-web.js";
import { ManiaBeatmap } from "@/types/database.beatmap";

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
   const maps = await maniaDb.find().toArray();
   const sums = maps.map(m => [m.title, m.ratings.nm.rd + m.ratings.dt.rd]);
   console.log(sums);
   // const client = new Client(await getOsuToken());
   // const mapIds = [4732473, 4732488, 4732525, 4732513, 4732510, 4732624, 4732519, 4732521];
   // const scores = [
   //    { rating: 1585, rd: 32.8 },
   //    { rating: 1303, rd: 32.6 },
   //    { rating: 1369, rd: 32.6 },
   //    { rating: 1485, rd: 32.6 },
   //    { rating: 1463, rd: 32.6 },
   //    { rating: 1542, rd: 32.4 },
   //    { rating: 1349, rd: 32.8 },
   //    { rating: 1444, rd: 32.6 }
   // ];
   // const maps = await client.beatmaps.getBeatmaps({
   //    query: { ids: mapIds }
   // });
   // console.log(maps);

   // const dbMaplist: ManiaBeatmap[] = [];
   // for (let i = 0; i < mapIds.length; i++) {
   //    const banchoMap = maps.find(m => m.id === mapIds[i]);
   //    if (!banchoMap) console.log(mapIds[i]);
   //    const mapData: ManiaBeatmap = {
   //       _id: mapIds[i],
   //       artist: banchoMap.beatmapset.artist,
   //       title: banchoMap.beatmapset.title,
   //       version: banchoMap.version,
   //       setid: banchoMap.beatmapset_id,
   //       stars: banchoMap.difficulty_rating,
   //       length: banchoMap.total_length,
   //       mapper: banchoMap.beatmapset.creator,
   //       bpm: banchoMap.bpm,
   //       cs: banchoMap.cs,
   //       maxCombo: banchoMap.max_combo,
   //       od: banchoMap.accuracy,
   //       noteCount: {
   //          circles: banchoMap.count_circles,
   //          sliders: banchoMap.count_sliders
   //       },
   //       ratings: {
   //          nm: {
   //             rating: scores[i].rating,
   //             rd: scores[i].rd * 2,
   //             vol: 0.06
   //          },
   //          dt: {
   //             rating: scores[i].rating * 1.01,
   //             rd: scores[i].rd * 3,
   //             vol: 0.06
   //          }
   //       },
   //       lastQuery: new Date(),
   //       lastUpdate: new Date(banchoMap.last_updated)
   //    };
   //    dbMaplist.push(mapData);
   // }
   // console.log(dbMaplist);
   // const result = await maniaDb.insertMany(dbMaplist);
   // console.log(result);
}
