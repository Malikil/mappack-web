import { submitPve } from "@/app/profile/[playerid]/pve/actions";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
   const auth = req.headers.get("Authorization");
   if (auth !== process.env.MATCH_SUBMIT_AUTH)
      return new NextResponse("Bad auth key", { status: 401 });

   const { mp }: { mp: number } = await req.json();
   console.log(`Add results from ${mp}`);

   const formData = new FormData();
   formData.append('mp', mp.toString());
   const status = await submitPve(formData);
   if (status?.http)
      return new NextResponse(status.http.message, { status: status.http.status })
   else return new NextResponse(null, { status: 200 });
};
