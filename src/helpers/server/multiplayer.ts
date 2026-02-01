import { Client } from "osu-web.js";
import { getOsuToken } from "../osuToken";
import { UndocumentedMatchDetails } from "@/types/undocumented/matches";

export async function getLobbyData(mp: number, client: Client = null) {
   if (!client) client = new Client(await getOsuToken());
   // Get initial match data
   const match = await client.getUndocumented<UndocumentedMatchDetails>(`matches/${mp}`);
   console.log({
      ...match,
      events: match.events.length,
      users: match.users.length
   });
   for (let i = 0; i < 1000 && match.events[0].id !== match.first_event_id; i++) {
      // There are still more events
      const nextBatch = await client.getUndocumented<UndocumentedMatchDetails>(`matches/${mp}`, {
         query: { before: match.events[0].id }
      });
      console.log(`${i}:`, nextBatch.events[0].id, "-", nextBatch.events.slice(-1)[0].id);
      match.events = nextBatch.events.concat(match.events);
   }
   console.log(
      `Complete fetch: ${match.first_event_id === match.events[0].id}`,
      match.events.length,
      "events"
   );
   const games = match.events.filter(e => e.game).map(g => g.game);
   return {
      ...match,
      games
   };
}
