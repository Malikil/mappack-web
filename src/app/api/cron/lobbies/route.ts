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
      const lobbies = {
         pvp: [] as MatchInfo[],
         pve: [] as Awaited<ReturnType<typeof getLobbyData>>[]
      };
      const MIN_LOBBIES_TO_FETCH = 25;
      const MAX_LOOPS = 10;
      let cursorString: string;
      for (let i = 0; i < MAX_LOOPS && lobbies.pve.length + lobbies.pvp.length < MIN_LOBBIES_TO_FETCH; i++) {
         const query: {
            active?: string;
            cursor_string?: string;
         } = { active: "false" };
         if (cursorString) query.cursor_string = cursorString;
         const matches = await client.getUndocumented<UndocumentedMatches>("matches", { query });
         if (cursorString === matches.cursor_string) break;
         cursorString = matches.cursor_string;
         const filtered: MatchInfo[] = matches.matches
            .map(m => ({
               ...m,
               start_time: new Date(m.start_time),
               end_time: new Date(m.end_time)
            }))
            .filter(m => m.end_time.getTime() - m.start_time.getTime() > minutes(15));
         // Filter out matches that are already submitted
         const existingLinks =
            filtered.length > 0
               ? await mpLinksDb
                    .find({ _id: { $in: filtered.map(m => m.id) } })
                    .map(d => d._id)
                    .toArray()
               : [];
         const doubleFilter = filtered.filter(m => !existingLinks.includes(m.id));
         console.log(doubleFilter.length, "new lobbies longer than 15 minutes");
         for (const match of doubleFilter) {
            console.log(
               convertTime((match.end_time.getTime() - match.start_time.getTime()) / 1000),
               match.id,
               match.name
            );
            if (match.name.match(/^.+?: \(.+?\) vs \(.+?\)$/)) lobbies.pvp.push(match);
            else {
               // Fetch data for the pve match and make sure it's valid
               const data = await getLobbyData(match.id, client);
               if (data.games.length > 0) lobbies.pve.push(data);
            }
         }
      }
      console.log("Add", lobbies.pvp.length + lobbies.pve.length, "new lobbies");
      const addLinks: { _id: number }[] = [];
      for (const match of lobbies.pvp.sort((a, b) => a.end_time.getTime() - b.end_time.getTime())) {
         console.log("Attempt add PvP", match.id);
         // For now, use the admin submit and legacy key
         const data = new FormData();
         data.append("mp", match.id.toString());
         data.append("warmup", "");
         const result = await adminPvp(data);
         if (result?.http?.message === "Invalid 1v1 match")
            console.warn("FAILED to add PvP", match.id, match.name);
      }
      // Next submit PvE
      for (const match of lobbies.pve.sort(
         (a, b) => a.match.end_time.getTime() - b.match.end_time.getTime()
      )) {
         console.log("Attempt add PvE", match.match.id);
         const result = await submitPveData(match);
         if (result) addLinks.push({ _id: match.match.id });
      }
      console.log("Add", addLinks.length, "pve matches");
      if (addLinks.length > 0) console.log("History result", await mpLinksDb.insertMany(addLinks));
      return new NextResponse("OK");
   } catch (err) {
      console.error(err);
      return new NextResponse("Error", { status: 500 });
   }
}
