import { NextRequest, NextResponse } from "next/server";
import { getMappool } from "./functions";
import { GameMode } from "osu-web.js";
import { ModPool } from "@/types/rating";
import { DbBeatmap } from "@/types/database.beatmap";

export const GET = async (req: NextRequest) => {
   const params = req.nextUrl.searchParams;
   const playerIds = params
      .getAll("p")
      .map(p => parseInt(p))
      .filter(p => p);
   let mode = params.get('m') as GameMode;
   if (!['osu', 'fruits', 'taiko', 'mania'].includes(mode)) mode = 'osu';

   const { maps, error } = await getMappool(playerIds, mode);
   if (error) return NextResponse.json({ message: error.message }, { status: error.status });
   // Rename _id to id for api response
   const result = Object.fromEntries(
   Object.keys(maps).map((k: ModPool) => [k, maps[k].map(bm => {
         const idMap = {
            ...bm,
            id: bm._id
         };
         delete idMap._id;
         return idMap;
      })]
   )) as Partial<Record<ModPool, (Omit<DbBeatmap, '_id'> & { id: number; })[]>>
   return NextResponse.json(result);
};
