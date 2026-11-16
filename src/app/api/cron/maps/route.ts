/// CRON job for updating map data of maps already in the database
/// Runs on each odd hour

import { NextRequest, NextResponse } from "next/server";
import { Client } from "osu-web.js";
import { mapsDb } from "@/database/connection";
import { getOsuToken } from "@/helpers/osuToken";
import { fetchUpdatesForMode } from "./functions";

export async function GET(req: NextRequest) {
   if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`)
      return new NextResponse("Unauthorized", { status: 401 });

   const accessToken = await getOsuToken();
   const client = new Client(accessToken);
   const cutoff = new Date();
   cutoff.setMonth(cutoff.getMonth() - 1);
   await fetchUpdatesForMode("osu", cutoff, client, mapsDb.osu);
   await new Promise(resolve => setTimeout(resolve, 200));
   await fetchUpdatesForMode("fruits", cutoff, client, mapsDb.fruits);
   await new Promise(resolve => setTimeout(resolve, 200));
   await fetchUpdatesForMode("taiko", cutoff, client, mapsDb.taiko);
   await new Promise(resolve => setTimeout(resolve, 200));
   await fetchUpdatesForMode("mania", cutoff, client, mapsDb.mania);
   return new NextResponse("OK");
}
