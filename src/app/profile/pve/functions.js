import { LegacyClient } from "osu-web.js";

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
 * @param {import("osu-web.js").Mod[]} lobbyMods 
 * @param {import("osu-web.js").Mod[]} scoreMods 
 */
function parseSongMods(lobbyMods, scoreMods) {
   const mods = lobbyMods
      .concat(scoreMods)
      // Ignore NF
      .filter(m => m !== "NF");
   // In order for the score to be valid, only one mod should be used
   if (mods.length > 1) return null;
   if (mods.length === 0) return "nm";
   else
      switch (mods[0]) {
         case "HD":
            return "hd";
         case "HR":
            return "hr";
         case "DT":
         case "NC":
            return "dt";
      }
}

/**
 * @param {string} link
 * @param {string} token
 * @returns {Promise<{
 *   [key: string]: {
 *     map: number;
 *     mod: 'nm'|'hd'|'hr'|'dt';
 *     score: number
 *   }[]
 * }>}
 */
export async function parseMpLobby(link) {
   const osuClient = new LegacyClient(process.env.OSU_LEGACY_KEY);
   const matchIdSegment = link.slice(link.lastIndexOf("/") + 1);
   try {
      const mpLobby = await osuClient.getMultiplayerLobby({ mp: matchIdSegment });
      const result = mpLobby.games.reduce((scoreAgg, game) => {
         if (game.end_time && game.scoring_type === "Score V2" && game.team_type === "Head To Head")
            game.scores.forEach(score => {
               const scoreResult = {
                  map: game.beatmap_id,
                  mod: parseSongMods(game.mods, score.enabled_mods),
                  score: score.score
               };
               if (scoreResult.mod) {
                  if (!(score.user_id in scoreAgg)) scoreAgg[score.user_id] = [];
                  scoreAgg[score.user_id].push(scoreResult);
               }
            });
         return scoreAgg;
      }, {});
      return result;
   } catch (err) {
      console.error(err);
   }
   // Test lobby: https://osu.ppy.sh/community/matches/116371941
}
