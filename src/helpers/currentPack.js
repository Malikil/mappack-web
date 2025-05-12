import db from "@/app/api/db/connection";

/**
 * @returns {Promise<import("@/types/database.beatmap").DbBeatmap[]>}
 */
export async function getCurrentPack() {
   const mapsCollection = db.collection("maps");
   const pools = await mapsCollection
      .find({ mode: "osu", $or: [{ active: "fresh" }, { active: "stale" }] })
      .toArray();
   const maps = [].concat(...pools.map(p => p.maps));
   return maps;
}
