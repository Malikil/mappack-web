import { NextResponse } from "next/server";
import { getMappool } from "./functions";

/**
 * @param {import('next/server').NextRequest} req
 */
export const GET = async req => {
   const params = req.nextUrl.searchParams;
   const playerIds = params
      .getAll("p")
      .map(p => parseInt(p))
      .filter(p => p);

   const { maps, error } = await getMappool(playerIds);
   if (error) return new NextResponse({ message: error.message }, { status: error.status });

   return NextResponse.json(maps);
};
