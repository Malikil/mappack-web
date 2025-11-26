import { playersDb } from "@/app/api/db/connection";
import { GameMode, Mod } from "osu-web.js";
import { combineRatings, matchResultValue } from "../rating-range";
import { Rating } from "@/types/rating";
import { Glicko2 } from "glicko2";

const MAP_STYLE_LEARNING_RATE = 0.001;
const STYLES_LEARNING_RATE = 0.01;
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

/**
 * Gives the outcome (0, 1) the player is expected to get on this map. If an array of skills is
 * provided they are also used in the prediction. Both skills arrays should be equal length.
 * @param playerRating
 * @param mapRating
 * @param playerSkills
 * @param mapSkills
 * @returns
 */
export function predictOutcome(
   playerRating: Rating,
   mapRating: Rating,
   playerSkills: number[] = [],
   mapSkills: number[] = []
) {
   const calculator = new Glicko2();
   const playerCalc = calculator.makePlayer(playerRating.rating, playerRating.rd, playerRating.vol);
   const mapCalc = calculator.makePlayer(mapRating.rating, mapRating.rd, mapRating.vol);
   const simplePredict = calculator.predict(playerCalc, mapCalc);
   let residual = 0;
   for (let i = 0; i < playerSkills.length; i++) residual += playerSkills[i] * mapSkills[i];
   return simplePredict + residual;
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
         styles: number[];
      };
      map: {
         _id: number;
         rating: Rating;
         mods: Partial<Record<Mod, number>>;
         styles: number[];
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
   // const mapUpdateCounts: Partial<
   //    Record<
   //       GameMode,
   //       {
   //          [id: number]: Partial<Record<Mod, number>>;
   //       }
   //    >
   // > = {};
   // const playerUpdateCounts: {
   //    [id: number]: Partial<Record<GameMode, Partial<Record<Mod, number>>>>;
   // } = {};

   for (const { mode, map, player, score } of results) {
      // Make sure the approprate gradients are available
      if (!(player._id in playerGradientsByPlayerId)) {
         playerGradientsByPlayerId[player._id] = {};
         originalPlayerMultipliers[player._id] = {};
         // playerUpdateCounts[player._id] = {};
      }
      if (!(mode in playerGradientsByPlayerId[player._id])) {
         playerGradientsByPlayerId[player._id][mode] = {};
         originalPlayerMultipliers[player._id][mode] = player.mods;
         // playerUpdateCounts[player._id][mode] = {};
      }
      if (!(mode in mapGradientsByMode)) {
         mapGradientsByMode[mode] = {};
         originalMapMultipliers[mode] = {};
         // mapUpdateCounts[mode] = {};
      }
      if (!(map._id in mapGradientsByMode[mode])) {
         mapGradientsByMode[mode][map._id] = {};
         originalMapMultipliers[mode][map._id] = map.mods;
         // mapUpdateCounts[mode][map._id] = {};
      }

      // Calculate the adjusted score
      const playerModsModifier = score.mods.reduce((mult, mod) => mult * (player.mods[mod] || 1), 1);
      const mapModsModifier = score.mods.reduce((mult, mod) => mult * (map.mods[mod] || 1), 1);
      const modAdjustedScore = score.score * playerModsModifier * mapModsModifier;
      const outcome = matchResultValue(modAdjustedScore, mode);

      // Calculate the expected result
      const expectedResult = predictOutcome(player.rating, map.rating, player.styles, map.styles);
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
         // mapUpdateCounts[mode][map._id][mod] = (mapUpdateCounts[mode][map._id][mod] || 0) + 1;
         playerGradientsByPlayerId[player._id][mode][mod] =
            (playerGradientsByPlayerId[player._id][mode][mod] || 0) - error * MODS_LEARNING_RATE;
         // playerUpdateCounts[player._id][mode][mod] = (playerUpdateCounts[player._id][mode][mod] || 0) + 1;
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
               const naiveUpdatedMod = (originalPlayerMultipliers[id][mode][mod] || 1) + adjustment; // / playerUpdateCounts[id][mode][mod];
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
               const naiveUpdatedMod = (originalMapMultipliers[mode][id][mod] || 1) + adjustment; // / mapUpdateCounts[mode][id][mod];
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

export async function getUpdatedStylesFromBatch(
   results: {
      mode: GameMode;
      score: number;
      player: Rating & {
         id: number;
         styles: number[];
      };
      map: Rating & {
         id: number;
         styles: number[];
      };
   }[]
) {
   const nSkills = parseInt(process.env.SKILL_CATEGORIES);
   const playerGradientsList: {
      [id: number]: Partial<Record<GameMode, number[]>>;
   } = {};
   const mapGradientsList: {
      [id: number]: Partial<Record<GameMode, number[]>>;
   } = {};
   for (const { mode, score, player, map } of results) {
      // Get the appropriate gradients
      if (!(player.id in playerGradientsList)) playerGradientsList[player.id] = {};
      const playerGradients = playerGradientsList[player.id];
      if (!(mode in playerGradients)) playerGradients[mode] = Array(nSkills).fill(0);
      if (!(map.id in mapGradientsList)) mapGradientsList[map.id] = {};
      const mapGradients = mapGradientsList[map.id];
      if (!(mode in mapGradients)) mapGradients[mode] = Array(nSkills).fill(0);

      // To update style weights, get the expected score
      const scoreResult = matchResultValue(score, mode);
      const expectedResult = predictOutcome(player, map, player.styles, map.styles);
      const error = scoreResult - expectedResult;
      for (let i = 0; i < nSkills; i++) {
         // Gradient for player skill comes from sum of errors for each map
         playerGradients[mode][i] += error * map.styles[i];
         // Thus, gradient for map requirements should come from errors for each player
         mapGradients[mode][i] -= error * player.styles[i];
      }
   }
   return {
      players: Object.fromEntries(
         Object.entries(playerGradientsList).map(([idStr, modeGradients]) => {
            return [
               idStr,
               Object.fromEntries(
                  Object.entries(modeGradients).map(([mode, gradients]) => {
                     const playerOldStyles = results.find(
                        r => r.player.id === parseInt(idStr) && r.mode === mode
                     );
                     return [
                        mode,
                        gradients.map(
                           (v, i) =>
                              v +
                              STYLES_LEARNING_RATE *
                                 (playerOldStyles.player.styles[i] - STYLES_REGULARIZATION * v)
                        )
                     ];
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
                     const mapOldStyles = results.find(r => r.map.id === parseInt(idStr) && r.mode === mode);
                     return [
                        mode,
                        gradients.map(
                           (v, i) =>
                              v +
                              MAP_STYLE_LEARNING_RATE *
                                 (mapOldStyles.map.styles[i] - STYLES_REGULARIZATION * v)
                        )
                     ];
                  })
               )
            ];
         })
      ) as { [id: number]: Partial<Record<GameMode, number[]>> }
   };
}
