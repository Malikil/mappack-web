"use server";

import util from "util";
import { playersDb } from "@/app/api/db/connection";
import { batchCursor } from "@/helpers/list-splitter";
import { getOsuToken } from "@/helpers/osuToken";
import { Client } from "osu-web.js";
import { DbPlayer } from "@/types/database.player";

export async function debug() {
   const client = new Client(await getOsuToken());
   const players = playersDb.aggregate<DbPlayer>([
      { $match: { "osu.pve.songs": { $gt: 10 }, "osu.pve.games": { $gt: 1 } } },
      { $sort: { "osu.pve.rd": 1 } },
      { $limit: 600 }
   ]);
   for await (const plist of batchCursor(players)) {
      const osuPlayers = await client.users.getUsers({ query: { ids: plist.map(p => p.osuid) } });
      osuPlayers.forEach(op => {
         const dbp = plist.find(p => p.osuid === op.id);
         console.log(`${op.statistics_rulesets.osu.pp}, ${dbp.osu.pve.rating}`);
      });
   }
}
