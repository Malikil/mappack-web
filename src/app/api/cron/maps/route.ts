/// CRON job for updating map data of maps already in the database
/// Runs daily

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
   await fetchUpdatesForMode("fruits", cutoff, client, mapsDb.fruits);
   await fetchUpdatesForMode("taiko", cutoff, client, mapsDb.taiko);
   await fetchUpdatesForMode("mania", cutoff, client, mapsDb.mania);
}
