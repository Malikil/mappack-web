import { createMappool, cyclePools } from "@/helpers/addPool";
import { NextRequest, NextResponse } from "next/server";
import { Client } from "osu-web.js";
import { days } from "@/time";
import db from "../../db/connection";
import { Collection, FindCursor } from "mongodb";

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

/**
 * @param {FindCursor} cursor
 * @param {number} batchSize
 */
async function* batchCursor(cursor, batchSize) {
   let batch = [];
   for await (const document of cursor) {
      batch.push(document);
      if (batch.length >= batchSize) {
         yield batch;
         batch = [];
      }
   }
   if (batch.length > 0) yield batch;
}

/**
 * @param {NextRequest} req
 */
export async function GET(req) {
   if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`)
      return new NextResponse("Unauthorized", { status: 401 });

   // Get recent beatmap packs
   //const accessToken = await getOsuToken();
   //const client = new Client(accessToken);
   const playerDb = db.collection("players");
   /** @type {AsyncGenerator<import("@/types/database.player").DbPlayer[]>} */
   const playerList = batchCursor(playerDb.find(), 50);
   for await (const player of playerList) {
      // Get the player's current pp
      console.log(player);
      console.log(player.length);
   }
   return new NextResponse("OK");
   // return cyclePools().then(
   //    () => new NextResponse("OK"),
   //    err => {
   //       console.error(err);
   //       return new NextResponse("Error", { status: 500 });
   //    }
   // );
}
