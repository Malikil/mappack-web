import { playersDb } from "@/app/api/db/connection";
import { redirect } from "next/navigation";

export async function getOpponentMappool(userid: number, formData: FormData) {
   const opp = formData.get("opponent") as string;
   const opponent = await playersDb.findOne({
      $or: [{ osuid: parseInt(opp) }, { osuname: opp }]
   });
   return redirect(`/mappool/${userid}/${opponent?.osuid || ""}`);
}
