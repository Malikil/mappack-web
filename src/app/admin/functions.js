"use server";

import { auth } from "@/auth";
import db from "../api/db/connection";
import { cache } from "react";

const checkAdmin = cache(async osuid => {
   const collection = db.collection("players");
   const player = await collection.findOne({ osuid, admin: true });
   return player;
});

export const verify = async () => {
   const session = await auth();
   if (session) {
      /** @type {import("@/types/database.player").DbPlayer} */
      const user = await checkAdmin(session.user.id);
      if (user) return { session, user };
   }
   return {
      session: null,
      user: null
   };
};
