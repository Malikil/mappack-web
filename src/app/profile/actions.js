"use server";

import { auth } from "@/auth";
import db from "../api/db/connection";
import { redirect, RedirectType } from "next/navigation";

export async function register(osuid, osuname) {
   console.log(`Register player ${osuid}`);
   const collection = db.collection("players");
   await collection.insertOne({
      osuid,
      osuname,
      pvp: {
         rating: 1500,
         rd: 350,
         vol: 0.06,
         matches: [],
         wins: 0,
         losses: 0
      },
      pve: {
         rating: 1500,
         rd: 350,
         vol: 0.06,
         matches: []
      }
   });
}

export async function generateAttack(osuid) {
   const playersDb = db.collection("players");
   const player = await playersDb.findOne({ osuid });
   console.log(
      `Target range: ${(player.pve.rating - player.pve.rd).toFixed(1)} - ${(
         player.pve.rating + player.pve.rd
      ).toFixed(1)}`
   );
   const mapsDb = db.collection("maps");
   const mappack = await mapsDb.findOne({ active: "current" });
   const availableMaps = mappack.maps
      .flatMap(map =>
         Object.keys(map.ratings).map(mod => ({
            id: map.id,
            mod,
            rating: map.ratings[mod]
         }))
      )
      .filter(map => Math.abs(player.pve.rating - map.rating.rating) <= player.pve.rd);
   console.log(`${availableMaps.length} available maps`);

   const selectedMaps = Array.from({ length: Math.min(7, availableMaps.length) }, () => {
      const index = (Math.random() * availableMaps.length) | 0;
      const [selected] = availableMaps.splice(index, 1);
      return selected;
   });
   console.log(selectedMaps);

   return selectedMaps.map(m => `${m.id}+${m.mod.toUpperCase()}`);
}

export async function getOpponentMappool(userid, formData) {
   const opp = formData.get("opponent");
   const playersDb = db.collection("players");
   const opponent = await playersDb.findOne({
      $or: [{ osuid: parseInt(opp) }, { osuname: opp }]
   });
   return redirect(`/mappool/${userid}/${opponent.osuid}`);
}
