import { playersDb } from "@/app/api/db/connection";
import { GameMode, Mod } from "osu-web.js";
import { combineRatings, matchResultValue, predictOutcome } from "../rating-range";
import { Rating } from "@/types/rating";

const MAP_STYLE_LEARNING_RATE = 0.05;
const PLAYER_STYLES_LEARNING_RATE = 0.01;
const STYLES_REGULARIZATION = 0.1;
/**
 * The largest possible update per mod per play
 */
const MODS_LEARNING_RATE = 0.005;
/**
 * How aggresively should the updated mods be nudged back towards 1x after an update
 */
const MODS_REGULARIZATION = 0.01;

export async function combineRatingsById(mode: GameMode, ...playerIds: number[]) {
   const players = await playersDb
      .find({ _id: { $in: playerIds }, [`${mode}.pvp`]: { $exists: true } })
      .toArray();
   if (players.length < 1) return;
   const targetRating = combineRatings(...players.map(p => p[mode].pvp));
   return {
      targetRating,
      players
   };
}

export function getUpdatedModsFromBatch(
   results: {
      mode: GameMode;
      score: {
         score: number;
         mods: Mod[];
      };
      player: {
         rating: Rating;
         _id: number;
         mods: Partial<Record<Mod, number>>;
      };
      map: {
         _id: number;
         rating: Rating;
         mods: Partial<Record<Mod, number>>;
      };
   }[]
) {
   const playerGradientsByPlayerId: {
      [id: number]: Partial<Record<GameMode, Partial<Record<Mod, number>>>>;
   } = {};
   const mapGradientsByMode: Partial<
      Record<
         GameMode,
         {
            [id: number]: Partial<Record<Mod, number>>;
         }
      >
   > = {};
   const originalPlayerMultipliers: {
      [id: number]: Partial<Record<GameMode, Partial<Record<Mod, number>>>>;
   } = {};
   const originalMapMultipliers: Partial<
      Record<
         GameMode,
         {
            [id: number]: Partial<Record<Mod, number>>;
         }
      >
   > = {};

   for (const { mode, map, player, score } of results) {
      // Make sure the approprate gradients are available
      if (!(player._id in playerGradientsByPlayerId)) {
         playerGradientsByPlayerId[player._id] = {};
         originalPlayerMultipliers[player._id] = {};
      }
      if (!(mode in playerGradientsByPlayerId[player._id])) {
         playerGradientsByPlayerId[player._id][mode] = {};
         originalPlayerMultipliers[player._id][mode] = player.mods;
      }
      if (!(mode in mapGradientsByMode)) {
         mapGradientsByMode[mode] = {};
         originalMapMultipliers[mode] = {};
      }
      if (!(map._id in mapGradientsByMode[mode])) {
         mapGradientsByMode[mode][map._id] = {};
         originalMapMultipliers[mode][map._id] = map.mods;
      }

      // Calculate the adjusted score
      const playerModsModifier = score.mods.reduce((mult, mod) => mult * (player.mods[mod] || 1), 1);
      const mapModsModifier = score.mods.reduce((mult, mod) => mult * (map.mods[mod] || 1), 1);
      const modAdjustedScore = score.score * playerModsModifier * mapModsModifier;
      const outcome = matchResultValue(modAdjustedScore, mode);

      // Calculate the expected result
      const expectedResult = predictOutcome(player.rating, map.rating);
      const error = outcome - expectedResult;
      // Update mods gradients
      // Applying the same adjustment for multiple mods like this will cause multi-mod plays to create a larger adjustment
      // but I'm okay with that for now.
      score.mods.forEach(mod => {
         // The adjusted score came from score * playerMod * mapMod
         // If the score is too low (error is negative) then playerMod and mapMod should both be increased
         // Error will be a value between -1 and 1. Add to the gradient a percentage of that error
         mapGradientsByMode[mode][map._id][mod] =
            (mapGradientsByMode[mode][map._id][mod] || 0) - error * MODS_LEARNING_RATE;
         playerGradientsByPlayerId[player._id][mode][mod] =
            (playerGradientsByPlayerId[player._id][mode][mod] || 0) - error * MODS_LEARNING_RATE;
      });
   }

   const playerModsUpdated: {
      [id: number]: Partial<Record<GameMode, Partial<Record<Mod, number>>>>;
   } = {};
   const mapModsUpdated: Partial<
      Record<
         GameMode,
         {
            [id: number]: Partial<Record<Mod, number>>;
         }
      >
   > = {};
   // Update the player mods
   Object.entries(playerGradientsByPlayerId).forEach(([idstr, gradientsByMode]) => {
      const id = parseInt(idstr);
      if (!(id in playerModsUpdated)) playerModsUpdated[id] = {};
      Object.entries(gradientsByMode).forEach(
         ([mode, gradients]: [GameMode, Partial<Record<Mod, number>>]) => {
            if (!(mode in playerModsUpdated[id])) playerModsUpdated[id][mode] = {};
            Object.entries(gradients).forEach(([mod, adjustment]: [Mod, number]) => {
               // First just add the gradient to the previous mod value
               const naiveUpdatedMod = (originalPlayerMultipliers[id][mode][mod] || 1) + adjustment;
               // Nudge the value towards 1, for safety and control
               const nudgeDifference = (naiveUpdatedMod - 1) * MODS_REGULARIZATION;
               const finalModifier = naiveUpdatedMod - nudgeDifference;
               playerModsUpdated[id][mode][mod] = finalModifier;
            });
         }
      );
   });

   // Update map mods
   Object.entries(mapGradientsByMode).forEach(
      ([mode, gradientsByMapId]: [
         GameMode,
         {
            [id: number]: Partial<Record<Mod, number>>;
         }
      ]) => {
         if (!(mode in mapModsUpdated)) mapModsUpdated[mode] = {};
         Object.entries(gradientsByMapId).forEach(([idstr, gradients]) => {
            const id = parseInt(idstr);
            if (!(id in mapModsUpdated[mode])) mapModsUpdated[mode][id] = {};
            Object.entries(gradients).forEach(([mod, adjustment]: [Mod, number]) => {
               // Add gradient
               const naiveUpdatedMod = (originalMapMultipliers[mode][id][mod] || 1) + adjustment;
               // Nudge towards 1
               const nudgeDifference = (naiveUpdatedMod - 1) * MODS_REGULARIZATION;
               const finalModifier = naiveUpdatedMod - nudgeDifference;
               mapModsUpdated[mode][id][mod] = finalModifier;
            });
         });
      }
   );

   return {
      players: playerModsUpdated,
      maps: mapModsUpdated
   };
}

function ensureStyleLength(styles: number[], n: number) {
   if (styles.length === n) return styles;
   const padded = styles.slice();
   while (padded.length < n) padded.push(((Math.random() - 0.5) * Math.sqrt(n)) / 100);
   return padded.slice(0, n);
}
function normalize(vec: number[], maxNorm = 1) {
   const norm = Math.hypot(...vec);
   if (norm <= maxNorm) return vec;
   return vec.map(v => v * (maxNorm / norm));
}

/**
 * @param {object} results 
 * @param results.score Score after mods are applied
 */
export function getUpdatedStylesFromBatch(
   results: {
      mode: GameMode;
      score: number;
      player: {
         _id: number;
         rating: Rating;
         styles: number[];
      };
      map: {
         _id: number;
         rating: Rating;
         styles: number[];
      };
      mods?: {
         mods: Mod[];
         player: Partial<Record<Mod, number>>;
         map: Partial<Record<Mod, number>>;
      }
   }[]
) {
   const nSkills = parseInt(process.env.SKILL_CATEGORIES);
   const skillsEnsuredResults = results.map(r => ({
      ...r,
      player: {
         ...r.player,
         styles: ensureStyleLength(r.player.styles, nSkills)
      },
      map: {
         ...r.map,
         styles: ensureStyleLength(r.map.styles, nSkills)
      }
   }));
   const playerGradientsList: {
      [id: number]: Partial<Record<GameMode, number[]>>;
   } = {};
   const mapGradientsList: {
      [id: number]: Partial<Record<GameMode, number[]>>;
   } = {};
   for (const { mode, score, player, map, mods } of skillsEnsuredResults) {
      // Get the appropriate gradients
      if (!(player._id in playerGradientsList)) playerGradientsList[player._id] = {};
      const playerGradients = playerGradientsList[player._id];
      if (!(mode in playerGradients)) playerGradients[mode] = Array(nSkills).fill(0);
      if (!(map._id in mapGradientsList)) mapGradientsList[map._id] = {};
      const mapGradients = mapGradientsList[map._id];
      if (!(mode in mapGradients)) mapGradients[mode] = Array(nSkills).fill(0);

      // To update style weights, get the expected score
      const scoreResult = matchResultValue(score, mode, mods);
      const expectedResult = predictOutcome(player.rating, map.rating, player.styles, map.styles);
      const error = scoreResult - expectedResult;
      const scale = 1 / Math.sqrt(nSkills);
      for (let i = 0; i < nSkills; i++) {
         // Gradient for player skill comes from sum of errors for each map
         playerGradients[mode][i] += scale * error * map.styles[i];
         // Thus, gradient for map requirements should come from errors for each player
         mapGradients[mode][i] += scale * error * player.styles[i];
      }
   }
   return {
      players: Object.fromEntries(
         Object.entries(playerGradientsList).map(([idStr, modeGradients]) => {
            return [
               idStr,
               Object.fromEntries(
                  Object.entries(modeGradients).map(([mode, gradients]) => {
                     const playerOldStyles = skillsEnsuredResults.find(
                        r => r.player._id === parseInt(idStr) && r.mode === mode
                     ).player.styles;
                     const playerNewStyles = normalize(
                        gradients.map(
                           (v, i) =>
                              playerOldStyles[i] +
                              PLAYER_STYLES_LEARNING_RATE * (v - STYLES_REGULARIZATION * playerOldStyles[i])
                        )
                     );
                     return [mode, playerNewStyles];
                  })
               )
            ];
         })
      ) as { [id: number]: Partial<Record<GameMode, number[]>> },
      maps: Object.fromEntries(
         Object.entries(mapGradientsList).map(([idStr, modeGradients]) => {
            return [
               idStr,
               Object.fromEntries(
                  Object.entries(modeGradients).map(([mode, gradients]) => {
                     const mapOldStyles = skillsEnsuredResults.find(
                        r => r.map._id === parseInt(idStr) && r.mode === mode
                     ).map.styles;
                     const mapNewStyles = normalize(
                        gradients.map(
                           (v, i) =>
                              mapOldStyles[i] +
                              MAP_STYLE_LEARNING_RATE * (v - STYLES_REGULARIZATION * mapOldStyles[i])
                        )
                     );
                     return [mode, mapNewStyles];
                  })
               )
            ];
         })
      ) as { [id: number]: Partial<Record<GameMode, number[]>> }
   };
}
