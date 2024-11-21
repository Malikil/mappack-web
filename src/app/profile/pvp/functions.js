import { LegacyClient } from "osu-web.js";

/**
 * @typedef SongResultScore
 * @prop {number} osuid
 * @prop {number} score
 * @prop {'hd'|'hr'|'hdhr'} [mod]
 */
/**
 * @typedef SongResultMap
 * @prop {number} map
 * @prop {'nm'|'hd'|'hr'|'dt'|'fm'} mod
 */
/**
 * @typedef MpLobbyResults
 * @prop {SongResultMap[]} maps
 * @prop {SongResultScore[]} winScores
 * @prop {SongResultScore[]} loseScores
 */

/**
 * @param {string} link
 * @returns {Promise<MpLobbyResults>}
 */
export async function parseMpLobby(link) {
   const osuClient = new LegacyClient(process.env.OSU_LEGACY_KEY);
   const matchIdSegment = link.slice(link.lastIndexOf("/") + 1);
   try {
      const mpLobby = await osuClient.getMultiplayerLobby({ mp: matchIdSegment });
      const result = mpLobby.games.reduce(
         (agg, game) => {
            // If length is 0, that means freemod is enabled. Length will be 1 if nomod (nf counts as the 1)
            const mod =
               game.mods.length === 0
                  ? "fm"
                  : (game.mods.filter(v => v !== "NF")[0] || "nm").toLowerCase();
            agg.maps.push({
               map: game.beatmap_id,
               mod
            });
            game.scores.forEach(score => {
               // Will HD always be first?
               const scoreMod = score.enabled_mods
                  .filter(v => v !== "NF")
                  .join("")
                  .toLowerCase();
               if (!(score.user_id in agg.scores)) agg.scores[score.user_id] = [];
               agg.scores[score.user_id].push({
                  osuid: score.user_id,
                  score: score.score,
                  mod: ["hd", "hr", "hdhr"].includes(scoreMod) ? scoreMod : null
               });
            });
            // Find the song winner
            const winner = game.scores.sort((a, b) => b.score - a.score)[0].user_id;
            agg.resultScore[winner] = (agg.resultScore[winner] || 0) + 1;
            return agg;
         },
         { maps: [], scores: {}, resultScore: {} }
      );
      const matchPlacement = Object.keys(result.resultScore).sort(
         (a, b) => result.resultScore[b] - result.resultScore[a]
      );
      return {
         maps: result.maps,
         winScores: result.scores[matchPlacement[0]],
         loseScores: result.scores[matchPlacement[1]]
      };
   } catch (err) {
      console.error(err);
   }
}
