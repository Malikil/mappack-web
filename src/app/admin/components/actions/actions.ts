"use server";

import util from "util";
import db, { historyDb, playersDb, taikoDb } from "@/app/api/db/connection";
import { batchCursor } from "@/helpers/list-splitter";
import { getOsuToken } from "@/helpers/osuToken";
import { DbHistory } from "@/types/database.history";
import { UndocumentedBeatmappackCompact } from "@/types/undocumented.beatmappacks";
import { PolynomialRegressor } from "@rainij/polynomial-regression-js";
import { Client, GameMode } from "osu-web.js";

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
   const mapsDbOld = db.collection("maps");
   const maps = await mapsDbOld.find({ mode: "taiko" }).toArray();
   const result = await taikoDb.insertMany(
      maps.map(m => {
         const doc: any = { ...m };
         doc._id = m.id;
         delete doc.id;
         delete doc.mode;
         return doc;
      })
   );
   console.log(result);
}
