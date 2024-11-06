"use server";

/**
 * @typedef DbBeatmap
 * @prop {number} id
 * @prop {number} setid
 * @prop {string} artist
 * @prop {string} title
 * @prop {string} version
 * @prop {number} length
 * @prop {number} drain
 * @prop {number} bpm
 * @prop {number} cs
 * @prop {number} ar
 * @prop {number} stars
 * @prop {number} mods
 */

import { Client } from "osu-web.js";
import { verify } from "../../functions";

export async function addMappool(formData) {
   const session = await verify();

   const packName = formData.get("packName");
   const download = formData.get("download");
   /** @type {number[]} */
   const mapsets = formData
      .get("maps")
      .split("\n")
      .map(v => parseInt(v))
      .filter(v => v);

   const osuClient = new Client(session.accessToken);

   /** @type {DbBeatmap[]} */
   const maplist = await mapsets.reduce(
      (prom, setId) =>
         prom.then(async arr => {
            /** @type {import("./undocumented.beatmapset").UndocumentedBeatmapsetResponse} */
            const mapset = await osuClient.getUndocumented(`beatmapsets/${setId}`);
            return arr.concat(
               mapset.beatmaps.map(bm => ({
                  id: bm.id,
                  setid: mapset.id,
                  artist: mapset.artist_unicode,
                  title: mapset.title_unicode,
                  version: bm.version,
                  length: bm.total_length,
                  drain: bm.hit_length,
                  bpm: bm.bpm,
                  cs: bm.cs,
                  ar: bm.ar,
                  stars: bm.difficulty_rating
               }))
            );
         }),
      Promise.resolve([])
   );
   console.log(maplist);
}
