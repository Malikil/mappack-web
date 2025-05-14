"use server";

import { revalidatePath } from "next/cache";
import { addMatchData, createPvpRegistration, parseMpLobby } from "@/app/api/db/pvp/functions";
import { LegacyClient } from "osu-web.js";

export async function createPvp(userid, gamemode) {
   const osu = new LegacyClient(process.env.OSU_LEGACY_KEY);
   const osuUser = await osu.getUser({ u: userid, m: gamemode });
   await createPvpRegistration(userid, osuUser.pp_raw, gamemode);
   revalidatePath(`/profile/${userid}`);
}

export async function submitPvp(formData) {
   let winnerId = formData.get("winner");
   let loserId = formData.get("loser");
   let formMaplist = [];
   /** @type {[number,string][]} */
   let winnerScores = [];
   /** @type {[number,string][]} */
   let loserScores = [];
   const mp = formData.get("mp");
   if (mp) {
      const matchData = await parseMpLobby(mp);
      console.log(matchData);
      winnerId = matchData.winnerId;
      loserId = matchData.loserId;
      formMaplist = matchData.maps;
      winnerScores = matchData.winnerScores;
      loserScores = matchData.loserScores;
   } else {
      formMaplist = formData
         .get("songs")
         .split("\n")
         .map(item => {
            const [map, mod] = item.split("+");
            const id = parseInt(map);
            return {
               map: id,
               mod: mod.trim().toLowerCase()
            };
         });
      winnerScores = formData
         .get("winnerScores")
         .split("\n")
         .map(s => {
            const sp = s.split("+");
            sp[0] = parseInt(sp[0]);
            if (sp[1]) sp[1] = sp[1].trim().toLowerCase();
            return sp;
         });
      loserScores = formData
         .get("loserScores")
         .split("\n")
         .map(s => {
            const sp = s.split("+");
            sp[0] = parseInt(sp[0]);
            if (sp[1]) sp[1] = sp[1].trim().toLowerCase();
            return sp;
         });
   }

   await addMatchData({ winnerId, loserId, maps: formMaplist, winnerScores, loserScores });

   revalidatePath("/profile");
}
