import { NextResponse } from "next/server";
import { addMatchData, parseMpLobby } from "./functions";

/**
 * @param {import('next/server').NextRequest} req
 */
export const POST = async req => {
   const auth = req.headers.get("Authorization");
   if (auth !== process.env.MATCH_SUBMIT_AUTH) return new NextResponse(null, { status: 404 });

   const { mp } = await req.json();
   console.log(`Add results from ${mp}`);

   const mpResults = await parseMpLobby(mp);
   await addMatchData(mpResults);
   return new NextResponse(null, { status: 200 });
};
