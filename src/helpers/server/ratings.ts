import { playersDb } from "@/app/api/db/connection";
import { GameMode } from "osu-web.js";
import { combineRatings } from "../rating-range";

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
