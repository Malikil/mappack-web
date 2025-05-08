import db from "@/app/api/db/connection";

/**
 * @param {import("osu-web.js").GameMode} mode
 * @returns {Promise<import("@/types/database.beatmap").DbBeatmap[]>}
 */
export async function getCurrentPack(mode = 'osu') {
   const mapsCollection = db.collection("maps");
   const pools = await mapsCollection
      .find({ mode, $or: [{ active: "fresh" }, { active: "stale" }] })
      .toArray();
   const maps = [].concat(...pools.map(p => p.maps));
   return maps;
}
