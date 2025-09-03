"use server";

import { mpLinksDb, playersDb } from "@/app/api/db/connection";
import { revalidatePath } from "next/cache";
import { parseMpLobby, submitPveData } from "./functions";
import { withinRange } from "@/helpers/rating-range";
import { getCurrentPack } from "@/helpers/server/currentPack";
import { SimpleMod } from "@/types/rating";

export async function generateAttack(osuid: number, mapcount = 7) {
   const player = await playersDb.findOne({ osuid });
   const pveStats = player[player.gamemode]?.pve;
   console.log(`Target range: ${pveStats.rating.toFixed(1)} ±${pveStats.rd.toFixed(1)}`);
   const packMaps = await getCurrentPack(player.gamemode || "osu");
   let availableMaps = packMaps
      .flatMap(map =>
         Object.keys(map.ratings).map((mod: SimpleMod) => ({
            id: map._id,
            setid: map.setid,
            mod,
            rating: map.ratings[mod]
         }))
      )
      .filter(map => withinRange(pveStats, map.rating));
   console.log(`${availableMaps.length} available maps`);

   const selectedMaps = Array.from({ length: mapcount }, () => {
      if (availableMaps.length < 1) return;
      const index = (Math.random() * availableMaps.length) | 0;
      const selected = availableMaps[index];
      availableMaps = availableMaps.filter(m => m.setid !== selected.setid);
      return selected;
   }).filter(v => v);
   console.log(selectedMaps);

   return selectedMaps.map(m => `${m.id}+${m.mod.toUpperCase()}`);
}

export async function submitPve(formData: FormData) {
   const mpLink = formData.get("mp").toString();
   const matchIdSegment = parseInt(mpLink.slice(mpLink.lastIndexOf("/") + 1));
   if (await mpLinksDb.findOne({ _id: matchIdSegment }))
      return {
         http: {
            status: 400,
            message: "MP link already submitted"
         }
      };
   const data = await parseMpLobby(matchIdSegment);
   if (!data)
      return {
         http: {
            status: 400,
            message: "Please finish the lobby before submitting"
         }
      };
   if (Object.keys(data.matches).length < 1)
      return {
         http: {
            status: 400,
            message: "No songs found"
         }
      };
   // Add the mp link to history
   mpLinksDb.insertOne({ _id: matchIdSegment });
   console.log(data.matches);
   try {
      await submitPveData(data);
   } catch (err) {
      console.warn(err);
      return {
         http: {
            status: 500,
            message: "Failed to fetch player information"
         }
      };
   }

   revalidatePath("/profile");
}
