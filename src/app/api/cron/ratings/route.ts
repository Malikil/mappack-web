import { NextRequest, NextResponse } from "next/server";
import { Client, GameMode } from "osu-web.js";
import db from "../../db/connection";
import { AnyBulkWriteOperation, FindCursor, UpdateFilter } from "mongodb";
import { DbPlayer } from "@/types/database.player";
import { convertPP } from "@/helpers/rankPredictor";

async function getOsuToken() {
   console.log("Get osu token");
   const url = new URL("https://osu.ppy.sh/oauth/token");
   const headers = {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
   };
   const body = `client_id=${process.env.AUTH_OSU_ID}&client_secret=${process.env.AUTH_OSU_SECRET}&grant_type=client_credentials&scope=public`;
   const osuResponse = await fetch(url, {
      method: "POST",
      headers,
      body
      // cache: "no-store" // TODO Investigate if this will be needed in production
   }).then(res => res.json());
   return osuResponse.access_token;
}

async function* batchCursor<T>(cursor: FindCursor<T>, batchSize: number) {
   let batch: T[] = [];
   for await (const document of cursor) {
      batch.push(document);
      if (batch.length >= batchSize) {
         yield batch;
         batch = [];
      }
   }
   if (batch.length > 0) yield batch;
}

export async function GET(req: NextRequest) {
   if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`)
      return new NextResponse("Unauthorized", { status: 401 });

   const accessToken = await getOsuToken();
   const client = new Client(accessToken);
   const playerDb = db.collection<DbPlayer>("players");
   const playerList = batchCursor(playerDb.find({ hideLeaderboard: { $exists: false } }), 50);
   const modes: GameMode[] = ["osu", "fruits", "taiko", "mania"];
   const updates: AnyBulkWriteOperation<DbPlayer>[] = [];
   for await (const playerBatch of playerList) {
      // Get the current pp for these players
      const osuData = await client.users.getUsers({
         query: { ids: playerBatch.map(p => p.osuid) }
      });
      for (const player of playerBatch) {
         const osu = osuData.find(d => d.id === player.osuid);
         const update: UpdateFilter<DbPlayer> = {};
         // If the player is inactive, hide them from the leaderboard
         if (!osu.is_active) update.$set = { hideLeaderboard: true };

         // Update pvp stats
         modes.forEach(mode => {
            if (player[mode]?.pvp) {
               // Remove stats for inactive modes
               if (!osu.statistics_rulesets[mode].pp)
                  update.$unset = {
                     ...update.$unset,
                     [`${mode}.pvp`]: ""
                  };
               // Increase rating deviation if they're still active and nudge their rating towards
               // an average value
               else
                  update.$set = {
                     ...update.$set,
                     [`${mode}.pvp.rd`]: player[mode].pvp.rd * 1.05,
                     [`${mode}.pvp.rating`]:
                        (player[mode].pvp.rating * 9 +
                           convertPP(osu.statistics_rulesets[mode].pp, mode)) /
                        10
                  };
            }
         });
         // If there are updates to perform, add them to the list
         if (Object.keys(update).length > 0)
            updates.push({
               updateOne: {
                  filter: { osuid: player.osuid },
                  update
               }
            });
      }
   }
   // console.log(
   //    util.inspect(updates, { depth: null, colors: true, compact: 3, breakLength: 80 })
   // );
   return playerDb.bulkWrite(updates).then(
      res => {
         console.log(res);
         return new NextResponse("OK");
      },
      err => {
         console.error(err);
         return new NextResponse("Failed to update players", { status: 500 });
      }
   );
}
