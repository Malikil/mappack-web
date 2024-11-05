"use server";

import { verify } from "../../functions";
import db from "@/app/api/db/connection";

/**
 * @param {object} data
 * @param {number} data.osuId
 * @param {string} data.discordId
 */
export async function addPlayer(data) {
   await verify();
   const playersCollection = db.collection("players");
   const addingPlayer = await playersCollection.findOne({
      $or: [{ osuid: data.osuId }, { discordid: data.discordId }]
   });
   if (addingPlayer) return false;

   await playersCollection.insertOne({
      osuid: data.osuId,
      discordid: data.discordId,
      maps: {
         current: [],
         previous: []
      }
   });
   return true;
}
