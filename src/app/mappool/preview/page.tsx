import { getMappool } from "@/app/api/db/mappool/functions";
import { GameMode } from "osu-web.js";
import PoolDisplayByMod from "../PoolDisplayByMod";

export default async function PlayerPool({ searchParams }) {
   const stringParams = await searchParams;
   let mode: GameMode | "4k" | "7k" = ["osu", "fruits", "mania", "taiko", "4k", "7k"].includes(stringParams.m)
      ? stringParams.m
      : "osu";
   let keyCount = 0;
   if (mode === "4k" || mode === "7k") {
      keyCount = mode === "7k" ? 7 : 4;
      mode = "mania";
   }
   const rating: number = parseInt(stringParams.r) || 1500;
   const rd: number = parseInt(stringParams.d) || 125;
   const { maps: maplist } = await getMappool({ rating, rd }, mode, keyCount);

   return (
      <PoolDisplayByMod
         title={`Pool for: ${mode}${keyCount ? keyCount : ""} ${rating} rd${rd}`}
         target={rating}
         maplist={maplist}
      />
   );
}
