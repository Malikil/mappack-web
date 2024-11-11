import { Client, LegacyClient } from "osu-web.js";

/**
 * Returns the match result to use, assuming player first then map second
 * @param {number} score
 */
export function matchResultValue(score) {
   const target = 600000;
   // Use a sliding scale
   const diff = score - target;
   // Above 900k and below 300k are capped with this scaling factor
   const scaledDiff = diff / 600000;
   // "tie" should move from 0 to 0.5
   const centeredDiff = scaledDiff + 0.5;
   // Clamp between [0, 1]
   const matchScore = Math.max(0, Math.min(1, centeredDiff));
   return matchScore;
}

/**
 * @param {string} str mapid+mod score
 * @returns {{
 *   map: number;
 *   mod: 'nm'|'hd'|'hr'|'dt';
 *   score: number
 * }[]}
 */
export function parsePvEString(str) {
   const matches = str.split("\n").map(ln => {
      const items = ln.split(" ");
      const [map, mod] = items[0].split("+");
      return {
         map: parseInt(map),
         mod: mod.toLowerCase(),
         score: parseInt(items[1])
      };
   });
   return matches;
}

/**
 * @param {string} link
 * @param {string} token
 * @returns {Promise<{
 *   map: number;
 *   mod: 'nm'|'hd'|'hr'|'dt';
 *   score: number
 * }[]>}
 */
export async function parseMpLobby(link) {
   return;
   const osuClient = new LegacyClient(process.env.OSU_LEGACY_KEY);
   const matchIdSegment = link.slice(link.lastIndexOf("/") + 1);
   try {
      const mpLobby = await osuClient.getMultiplayerLobby({ mp: matchIdSegment });
      console.log(mpLobby.games);
   } catch (err) {
      console.error(err);
   }
   // Test lobby: https://osu.ppy.sh/community/matches/116151054
}
