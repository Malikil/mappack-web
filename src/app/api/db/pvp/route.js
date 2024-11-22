import { NextResponse } from "next/server";
import { addMatchData, parseMpLobby } from "./functions";

/**
 * @param {import('next/server').NextRequest} req
 */
export const POST = async req => {
   const auth = req.headers.get("Authorization");
   if (auth !== process.env.MATCH_SUBMIT_AUTH) return new NextResponse(null, { status: 404 });

   const { mp, playerDefault } = await req.json();
   console.log(`Add results from ${mp}`);

   const mpResults = await parseMpLobby(mp);
   if (playerDefault === mpResults.winnerId) {
      mpResults.winnerId = mpResults.loserId;
      mpResults.loserId = playerDefault;
   }
   await addMatchData(mpResults);
   return new NextResponse(null, { status: 200 });
};
