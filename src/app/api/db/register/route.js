import { NextResponse } from "next/server";
import { register } from "./functions";

/**
 * @param {import('next/server').NextRequest} req
 */
export const POST = async req => {
   const auth = req.headers.get("Authorization");
   if (auth !== process.env.MATCH_SUBMIT_AUTH)
      return new NextResponse("Bad auth key", { status: 401 });

   const { osuid, osuname } = await req.json();
   console.log(`Register player ${osuname}`);
   const player = await register(osuid, osuname);
   console.log(player);
   return NextResponse.json(player);
};
