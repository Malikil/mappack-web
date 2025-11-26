import { NextRequest, NextResponse } from "next/server";
import { getMappool } from "./functions";
import { GameMode } from "osu-web.js";
import { ModPool } from "@/types/rating";
import { combineRatingsById } from "@/helpers/server/ratings";

export const GET = async (req: NextRequest) => {
   const params = req.nextUrl.searchParams;
   const playerIds = params
      .getAll("p")
      .map(p => parseInt(p))
      .filter(p => p);
   let mode = params.get("m") as GameMode | "4k" | "7k";
   let keyCount: number = 0;
   if (mode === "4k" || mode === "7k") {
      keyCount = mode === "7k" ? 7 : 4;
      mode = "mania";
   }
   if (!["osu", "fruits", "taiko", "mania"].includes(mode)) mode = "osu";

   // Get ratings
   const { targetRating } = await combineRatingsById(mode, ...playerIds);
   const { maps } = await getMappool(targetRating, mode, keyCount);
   // Move NM to FM for mania
   if (mode === "mania") {
      maps.fm = maps.nm;
      maps.nm = [];
   }
   // API response should be a list of ids for each mod
   const result = Object.fromEntries(
      Object.keys(maps).map((k: ModPool) => [k, maps[k].map(bm => bm._id)])
   ) as Partial<Record<ModPool, number[]>>;
   return NextResponse.json(result);
};
