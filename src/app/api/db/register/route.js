import { NextResponse } from "next/server";
import db from "../connection";
import { convertPP } from "@/helpers/rating-range";

/**
 * @param {import('next/server').NextRequest} req
 */
export const POST = async req => {
   const auth = req.headers.get("Authorization");
   if (auth !== process.env.MATCH_SUBMIT_AUTH)
      return new NextResponse("Bad auth key", { status: 401 });

   const { osuid, osuname, ppRaw } = await req.json();
   console.log(`Register player ${osuname} with ${ppRaw}pp`);

   const player = await db.collection("players").findOneAndUpdate(
      { osuid },
      {
         $set: {
            osuname,
            pvp: {
               rating: convertPP(ppRaw),
               rd: 175,
               vol: 0.06,
               matches: [],
               wins: 0,
               losses: 0
            },
            pve: {
               rating: 1500,
               rd: 350,
               vol: 0.06,
               matches: [],
               games: 0
            }
         },
         $unset: { hideLeaderboard: "" }
      },
      { upsert: true, returnDocument: "after", projection: { _id: 0 } }
   );
   console.log(player);
   return NextResponse.json(player);
};
