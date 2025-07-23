import { NextRequest, NextResponse } from "next/server";
import { addMatchData, createPvpRegistration, parseMpLobby } from "./functions";

export const POST = async (req: NextRequest) => {
   const auth = req.headers.get("Authorization");
   if (auth !== process.env.MATCH_SUBMIT_AUTH)
      return new NextResponse("Bad auth key", { status: 401 });

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

export const PUT = async (req: NextRequest) => {
   const auth = req.headers.get("Authorization");
   if (auth !== process.env.MATCH_SUBMIT_AUTH)
      return new NextResponse("Bad auth key", { status: 401 });

   const { id, pp_raw, mode } = await req.json();
   const player = await createPvpRegistration(id, pp_raw, mode);
   if (player) return NextResponse.json(player[mode].pvp, { status: 201 });
   else return new NextResponse("Couldn't create PvP stats", { status: 400 });
};
