import { NextRequest, NextResponse } from "next/server";
import { addMatchData, parseMpLobby } from "./functions";
import { createPvpRegistration } from "@/helpers/server/players";
import { MpLobbyResults } from "@/types/multiplayer";

export const POST = async (req: NextRequest) => {
   const auth = req.headers.get("Authorization");
   if (auth !== process.env.MATCH_SUBMIT_AUTH) return new NextResponse("Bad auth key", { status: 401 });

   const { mp, defaultWinner } = await req.json();
   console.log(`Add results from ${mp}`);

   const mpResults = await parseMpLobby(mp);
   if (defaultWinner === mpResults.loserId) {
      mpResults.loserId = mpResults.winnerId;
      mpResults.winnerId = defaultWinner;
   }
   if (mpResults.winnerId === "Red" || mpResults.winnerId === "Blue")
      return new NextResponse("Invalid 1v1", { status: 400 });
   await addMatchData(mpResults as MpLobbyResults);
   return new NextResponse(null, { status: 200 });
};

export const PUT = async (req: NextRequest) => {
   const auth = req.headers.get("Authorization");
   if (auth !== process.env.MATCH_SUBMIT_AUTH) return new NextResponse("Bad auth key", { status: 401 });

   const { id, mode } = await req.json();
   const player = await createPvpRegistration(id, mode);
   if (player) return NextResponse.json(player[mode].pvp, { status: 201 });
   else return new NextResponse("Couldn't create PvP stats", { status: 400 });
};
