"use server";

import { verify } from "../../functions";

export async function connectBancho() {
   await verify();
   console.log("Connect bancho");
}
