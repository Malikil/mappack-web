//import db from "@/app/api/db/connection";
import { SimpleMod } from "@/types/rating";
import { GameMode, LegacyClient, Mod } from "osu-web.js";

/**
 * Returns the match result to use, assuming player first then map second
 */
export function matchResultValue(score: number, gamemode: GameMode) {
   const min: number = {
      osu: 300000,
      fruits: 500000
   }[gamemode] || 300000;
   const max: number = 900000;
   if (score < min) return 0;
   if (score > max) return 1;
   // Scale linearly between min and max scores
   return (score - min) / (max - min);
}

function parseSongMods(lobbyMods: Mod[], scoreMods: Mod[]): SimpleMod {
   // When freemod is set on DT, DT will be in both arrays
   // Just take unique mods in general
   const mods = [
      ...new Set(
         lobbyMods
            .concat(scoreMods)
            // Ignore NF
            .filter(m => m !== "NF")
      )
   ];

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

export async function parseMpLobby(link: string) {
   const osuClient = new LegacyClient(process.env.OSU_LEGACY_KEY);
   const matchIdSegment = parseInt(link.slice(link.lastIndexOf("/") + 1));
   try {
      const mpLobby = await osuClient.getMultiplayerLobby({ mp: matchIdSegment });
      console.log(mpLobby.games.length);
      const results: {
         [user_id: string]: {
            map: number;
            mod: SimpleMod;
            score: number;
         }[];
      } = await mpLobby.games.reduce(async (agg, game) => {
         const scoreAgg = await agg;
         if (game.end_time && game.team_type === "Head To Head")
            if (game.scoring_type === "Score V2")
               game.scores.forEach(score => {
                  const scoreResult = {
                     map: game.beatmap_id,
                     mod: parseSongMods(game.mods, score.enabled_mods),
                     score: score.score
                  };
                  if (scoreResult.mod && scoreResult.score) {
                     if (!(score.user_id in scoreAgg)) scoreAgg[score.user_id] = [];
                     scoreAgg[score.user_id].push(scoreResult);
                  }
               });
            // else {
            //    const v1Score = await db.collection("v1meta").findOne({ _id: game.beatmap_id });
            //    if (v1Score)
            //       game.scores.forEach(score => {
            //          console.log(
            //             `Convert v1 score ${score.score} -> ${convertV1Score(score, v1Score.score)}`
            //          );
            //          const scoreResult = {
            //             map: game.beatmap_id,
            //             mod: parseSongMods(game.mods, score.enabled_mods),
            //             score: convertV1Score(score, v1Score.score)
            //          };
            //          if (scoreResult.mod && scoreResult.score) {
            //             if (!(score.user_id in scoreAgg)) scoreAgg[score.user_id] = [];
            //             scoreAgg[score.user_id].push(scoreResult);
            //          }
            //       });
            // }
         return scoreAgg;
      }, Promise.resolve({}));
      return { results, mp: matchIdSegment };
   } catch (err) {
      console.error(err);
   }
}

// /**
//  * @param {import("osu-web.js").LegacyMatchScore} score The achieved score
//  * @param {number} v1Score The maximum nomod score in v1
//  */
// function convertV1Score(score, v1Score) {
//    // Seems to be a ratio of 7:3 combo:acc
//    // For simplicity, just assume the v1 score *is* the combo score
//    const acc =
//       (score.count300 + score.count100 / 3 + score.count50 / 6) /
//       (score.count300 + score.count100 + score.count50 + score.countmiss);
//    // Seems to perform better when removing acc from combo component
//    const comboComponent =
//       ((score.score / v1Score) * 700000 * (score.enabled_mods.includes("NF") + 1)) / acc;
//    const accComponent = Math.pow(acc, 10) * 300000;
//    return parseInt((comboComponent + accComponent).toFixed());
// }
