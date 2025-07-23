import { SimpleMod } from "@/types/rating";
import { GameMode, LegacyClient, Mod } from "osu-web.js";

/**
 * Returns the match result to use, assuming player first then map second
 */
export function matchResultValue(score: number, gamemode: GameMode) {
   const min: number =
      {
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

export async function parseMpLobby(mp: number) {
   const osuClient = new LegacyClient(process.env.OSU_LEGACY_KEY);
   try {
      const mpLobby = await osuClient.getMultiplayerLobby({ mp });
      console.log(mpLobby.games.length);
      // Only accept finished lobbies
      if (!mpLobby.match.end_time) return {};
      const maps: Partial<Record<GameMode, Set<number>>> = {};
      const results: {
         [user_id: string]: {
            map: number;
            mod: SimpleMod;
            score: number;
            mode: GameMode;
         }[];
      } = mpLobby.games.reduce((scoreAgg, game) => {
         if (game.end_time && game.team_type === "Head To Head")
            if (game.scoring_type === "Score V2") {
               // Add to master maplist
               if (!(game.play_mode in maps)) maps[game.play_mode] = new Set();
               maps[game.play_mode].add(game.beatmap_id);
               // Add individual player scores
               game.scores.forEach(score => {
                  const scoreResult = {
                     map: game.beatmap_id,
                     mod: parseSongMods(game.mods, score.enabled_mods),
                     score: score.score,
                     mode: game.play_mode
                  };
                  if (scoreResult.mod && scoreResult.score) {
                     if (!(score.user_id in scoreAgg)) scoreAgg[score.user_id] = [];
                     scoreAgg[score.user_id].push(scoreResult);
                  }
               });
            }
         return scoreAgg;
      }, {});
      return {
         matches: results,
         maps: Object.keys(maps).flatMap<{ id: number; mode: GameMode }>((mode: GameMode) =>
            maps[mode]
               .values()
               .toArray()
               .map(id => ({ id, mode }))
         )
      };
   } catch (err) {
      console.error(err);
   }
}
