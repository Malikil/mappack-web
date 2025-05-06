import db from "@/app/api/db/connection";
import { redirect } from "next/navigation";

export async function getOpponentMappool(userid, formData) {
   const opp = formData.get("opponent");
   const playersDb = db.collection("players");
   const opponent = await playersDb.findOne({
      $or: [{ osuid: parseInt(opp) }, { osuname: opp }]
   });
   return redirect(`/mappool/${userid}/${opponent?.osuid || ""}`);
}
