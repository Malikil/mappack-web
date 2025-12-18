import { redirect } from "next/navigation";
import { getMappool } from "@/app/api/db/mappool/functions";
import { GameMode } from "osu-web.js";
import { combineRatingsById } from "@/helpers/server/ratings";
import PoolDisplayByMod from "../PoolDisplayByMod";

export default async function PlayerPool({ params, searchParams }) {
   const stringParams = await searchParams;
   const mode: GameMode = ["osu", "fruits", "mania", "taiko"].includes(stringParams.m)
      ? stringParams.m
      : "osu";
   const playerIds: number[] = (await params).playerids.map((id: string) => parseInt(id));
   if (playerIds.includes(NaN)) redirect("/mappool");

   const { targetRating, players } = await combineRatingsById(mode, ...playerIds);
   if (!targetRating) redirect("/mappool");
   const { maps: maplist } = await getMappool(targetRating, mode);

   return (
      <PoolDisplayByMod
         title={`Pool for: ${players.map(p => p.osuname).join(", ")}`}
         target={parseInt(targetRating.rating.toFixed())}
         maplist={maplist}
         mode={mode}
      />
   );
}
