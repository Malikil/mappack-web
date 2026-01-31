import { NextRequest, NextResponse } from "next/server";
import { Client } from "osu-web.js";
import { getOsuToken } from "@/helpers/osuToken";
import { MatchInfo, UndocumentedMatches } from "@/types/undocumented/matches";
import { convertTime, minutes } from "@/time";
import { adminPvp } from "@/app/admin/components/add-attack/actions";
import { getLobbyData } from "@/helpers/server/multiplayer";
import { submitPveData } from "@/helpers/server/pve";
import { mpLinksDb } from "../../db/connection";

// Max duration configurable is 60s without enabling fluid compute
export const maxDuration = 60;
export async function GET(req: NextRequest) {
   if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`)
      return new NextResponse("Unauthorized", { status: 401 });

   try {
      const client = new Client(await getOsuToken());
      let added = true;
      let cursorString: string;
      do {
         const query: {
            active?: string;
            cursor_string?: string;
         } = { active: 'false' };
         if (cursorString) query.cursor_string = cursorString;
         const matches = await client.getUndocumented<UndocumentedMatches>("matches", { query });
         if (cursorString === matches.cursor_string)
            break;
         cursorString = matches.cursor_string;
         // If there's no cursor, quit after completing the current loop
      
         const filtered: MatchInfo[] = matches.matches
            .map(m => ({
               ...m,
               start_time: new Date(m.start_time),
               end_time: new Date(m.end_time)
            }))
            .filter(m => m.end_time.getTime() - m.start_time.getTime() > minutes(10));
         console.log(filtered.length, 'lobbies longer than 10 minutes');
         const matchType = {
            tourney: [] as MatchInfo[],
            lobby: [] as MatchInfo[]
         };
         // Filter out matches that are already submitted
         const existingLinks = await mpLinksDb.find({ _id: { $in: filtered.map(m => m.id) }}).map(d => d._id).toArray();
         filtered.filter(m => !existingLinks.includes(m.id))
            .forEach(m => {
               console.log(m.id, convertTime((m.end_time.getTime() - m.start_time.getTime()) / 1000), m.name);
               if (m.name.match(/^.+?: \(.+?\) vs \(.+?\)$/)) matchType.tourney.push(m);
               else matchType.lobby.push(m);
            });
         console.log('Add', matchType.tourney.length + matchType.lobby.length, 'new lobbies');

         const addLinks: { _id: number }[] = [];
         // Submit 1v1s first
         for (const match of matchType.tourney.sort((a, b) => a.end_time.getTime() - b.end_time.getTime())) {
            console.log('Attempt add PvP', match.id);
            // For now, use the admin submit and legacy key
            const data = new FormData();
            data.append('mp', match.id.toString());
            data.append('warmup', '');
            const result = await adminPvp(data);
            if (result?.http?.message === "Invalid 1v1 match")
               // Add invalid matches to PvE list
               matchType.lobby.push(match);
         }
         // Next submit PvE
         for (const match of matchType.lobby.sort((a, b) => a.end_time.getTime() - b.end_time.getTime())) {
            console.log('Attempt add PvE', match.id);
            const data = await getLobbyData(match.id, client);
            const result = await submitPveData(data);
            if (result)
               addLinks.push({ _id: match.id });
         }
         added = addLinks.length > 0;
         if (added)
            await mpLinksDb.insertMany(addLinks);
      } while (added && cursorString);
      return new NextResponse("OK");
   } catch (err) {
      console.error(err);
      return new NextResponse("Error", { status: 500 });
   }
}
