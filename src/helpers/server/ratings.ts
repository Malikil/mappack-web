import { playersDb } from "@/app/api/db/connection";
import { GameMode } from "osu-web.js";
import { combineRatings, matchResultValue } from "../rating-range";
import { Rating } from "@/types/rating";
import { Glicko2 } from "glicko2";

const MAP_STYLE_LEARNING_RATE = 0.001;
const STYLES_LEARNING_RATE = 0.01;
const STYLES_REGULARIZATION = 0.1;

export async function combineRatingsById(mode: GameMode, ...playerIds: number[]) {
   const players = await playersDb
      .find({ osuid: { $in: playerIds }, [`${mode}.pvp`]: { $exists: true } })
      .toArray();
   if (players.length < 1) return;
   const targetRating = combineRatings(...players.map(p => p[mode].pvp));
   return {
      targetRating,
      players
   };
}

export function predictOutcome(
   playerRating: Rating,
   mapRating: Rating,
   playerSkills: number[],
   mapSkills: number[]
) {
   const calculator = new Glicko2();
   const playerCalc = calculator.makePlayer(playerRating.rating, playerRating.rd, playerRating.vol);
   const mapCalc = calculator.makePlayer(mapRating.rating, mapRating.rd, mapRating.vol);
   const simplePredict = calculator.predict(playerCalc, mapCalc);
   let residual = 0;
   for (let i = 0; i < playerSkills.length; i++) residual += playerSkills[i] * mapSkills[i];
   return simplePredict + residual;
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
