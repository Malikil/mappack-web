"use server";

import util from "util";
import db, {
   fruitsDb,
   historyDb,
   maniaDb,
   mpLinksDb,
   osuDb,
   playersDb,
   taikoDb
} from "@/app/api/db/connection";
import { batchCursor } from "@/helpers/list-splitter";
import { getOsuToken } from "@/helpers/osuToken";
import { Client } from "osu-web.js";
import { DbPlayer } from "@/types/database.player";

export async function debug() {
   const result = await playersDb.findOne({ osuname: "malikil" });
   console.log(result);
}
