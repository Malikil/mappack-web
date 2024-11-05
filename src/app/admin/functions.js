"use server";

import { auth } from "@/auth";
import db from "../api/db/connection";
import { cache } from "react";

const checkAdmin = cache(async osuid => {
   const collection = db.collection("players");
   const player = await collection.findOne({ osuid });
   return player && player.admin;
});

export const verify = async () => {
   const session = await auth();
   if (!session || !(await checkAdmin(session.user.id))) throw new Error("401");
   return session;
};
