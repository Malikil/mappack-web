import { auth } from "@/auth";
import db from "../connection";
import { NextResponse } from "next/server";

export const GET = async () => {
   const session = await auth();
   if (!session) return new NextResponse(null, { status: 401 });
   const collection = db.collection("players");
   const player = await collection.findOne({ osuid: session.user.id });
   if (!player) return new NextResponse(null, { status: 404 });
   // Screenshots can't be converted to json. Try sending data as form data instead
   // Screenshots should be converted to blob first
   player.maps.current = player.maps.current.map(m => {
      if (!m.screenshot) return m;

      const mapData = { ...m };
      // Theoretically I should verify the file type before storing it in the db
      mapData.screenshot = m.screenshot.buffer;
      return mapData;
   });
   // !! Per above: I thought I would have to come back to this to update it but it seems
   //    everything is working with just sending the buffer as-is. I'll leave it like this
   //    at least for a little while. Continue monitoring network usage with this method.
   return NextResponse.json(player);
};
