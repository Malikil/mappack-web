import { mappacksDb } from "@/app/api/db/connection";
import { DbBeatmap } from "@/types/database.beatmap";
import { GameMode } from "osu-web.js";

export async function getCurrentPack(mode: GameMode = "osu") {
   const pools = await mappacksDb.find({ mode, $or: [{ active: "fresh" }, { active: "stale" }] }).toArray();
   const maps: DbBeatmap[] = [].concat(...pools.map(p => p.maps));
   return maps;
}
