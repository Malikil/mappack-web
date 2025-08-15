import { ScoreParser } from "@/helpers/scorev1";
import { SimpleMod } from "@/types/rating";
import { GameMode, LegacyClient, Mod } from "osu-web.js";

/**
 * Returns the match result to use, assuming player first then map second
 */
export function matchResultValue(score: number, gamemode: GameMode) {
   const min: number = {
      osu: 100000,
      fruits: 500000,
      taiko: 300000,
      mania: 300000
   }[gamemode];
   const max: number = 900000;
   if (score < min) return 0;
   if (score > max) return 1;
   // Scale linearly between min and max scores
   return (score - min) / (max - min);
}

function parseSongMods(lobbyMods: Mod[], scoreMods: Mod[], mode: GameMode): SimpleMod {
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
   else if (mode === "mania") {
      if (mods[0] === "DT" || mods[0] === "NC") return "dt";
      else return "nm";
   } else
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
      console.log(`${mpLobby.games.length} songs played`);
      // Only accept finished lobbies
      console.log(`Finished ${mpLobby.match.end_time}`);
      if (!mpLobby.match.end_time) return {};

      const maps: Partial<Record<GameMode, Set<number>>> = {};
      const results = await mpLobby.games.reduce(
         (prom, game) =>
            prom.then(async scoreAgg => {
               if (game.end_time && (game.team_type === "Head To Head" || game.team_type === "Team VS")) {
                  const scoreType = game.scoring_type;
                  // Add to master maplist
                  if (!(game.play_mode in maps)) maps[game.play_mode] = new Set();
                  maps[game.play_mode].add(game.beatmap_id);
                  // Add individual player scores
                  for (const score of game.scores) {
                     const scoreResult = {
                        map: game.beatmap_id,
                        mod: parseSongMods(game.mods, score.enabled_mods, game.play_mode),
                        score: new ScoreParser(score, scoreType, game.play_mode),
                        mode: game.play_mode
                     };
                     if (scoreResult.mod && scoreResult.score) {
                        if (!(score.user_id in scoreAgg)) scoreAgg[score.user_id] = [];
                        scoreAgg[score.user_id].push(scoreResult);
                     }
                  }
               }
               return scoreAgg;
            }),
         Promise.resolve(
            {} as {
               [user_id: number]: {
                  map: number;
                  mod: SimpleMod;
                  score: ScoreParser<GameMode>;
                  mode: GameMode;
               }[];
            }
         )
      );
      return {
         matches: results,
         maps
      };
   } catch (err) {
      console.error(err);
   }
}
