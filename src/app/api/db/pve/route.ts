import { NextRequest, NextResponse } from "next/server";
import { mpLinksDb } from "../connection";
import { getLobbyData } from "@/helpers/server/multiplayer";
import { submitPveData } from "@/helpers/server/pve";

export const POST = async (req: NextRequest) => {
   const auth = req.headers.get("Authorization");
   if (auth !== process.env.MATCH_SUBMIT_AUTH) return new NextResponse("Bad auth key", { status: 401 });

   const { mp }: { mp: number } = await req.json();
   console.log(`Add results from ${mp}`);

   if (await mpLinksDb.findOne({ _id: mp }))
      return new NextResponse("MP link already submitted", { status: 400 });
   try {
      const lobby = await getLobbyData(mp);
      const success = await submitPveData(lobby);
      if (!success) return new NextResponse("Incomplete lobby found", { status: 400 });
      // Add the mp link to history
      mpLinksDb.insertOne({ _id: mp });

      return new NextResponse(null, { status: 200 });
   } catch (err) {
      console.error(err);
      return new NextResponse(null, { status: 500 });
   }
};
