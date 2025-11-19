"use server";

import { auth } from "@/auth";
import { playersDb } from "../api/db/connection";
import { cache } from "react";

const checkAdmin = cache(async (osuid: number) => {
   const player = await playersDb.findOne({ _id: osuid, admin: true });
   return player;
});

export const verify = async () => {
   const session = await auth();
   if (session) {
      const user = await checkAdmin(session.user.id);
      if (user) return { session, user };
   }
   return {
      session: null,
      user: null
   };
};
