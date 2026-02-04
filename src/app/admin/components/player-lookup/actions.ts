"use server";

import { playersDb } from "@/app/api/db/connection";
import { auth } from "@/auth";
import { combineRatingsById } from "@/helpers/server/ratings";
import { Rating } from "@/types/rating";

export async function fetchPlayerList(ids: number[]): Promise<Rating> {
   const session = await auth();
   const mode = session ? (await playersDb.findOne({ _id: session.user.id }))?.gamemode || 'osu' : 'osu';
   return (await combineRatingsById(mode, ...ids)).targetRating;
}
