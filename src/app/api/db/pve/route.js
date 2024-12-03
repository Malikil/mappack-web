import { generateAttack } from "@/app/profile/pve/actions";
import { NextResponse } from "next/server";

/**
 * @param {import('next/server').NextRequest} req
 */
export const GET = async req => {
   const params = req.nextUrl.searchParams;
   const playerId = parseInt(params.get("p"));
   const mapcount = parseInt(params.get("n") || 7);
   try {
      const mapStrings = await generateAttack(playerId, mapcount);
      return NextResponse.json(mapStrings);
   } catch (err) {
      return new NextResponse(err.message, { status: 400 });
   }
};
