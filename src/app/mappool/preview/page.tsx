import { getMappool } from "@/app/api/db/mappool/functions";
import { GameMode } from "osu-web.js";
import PoolDisplayByMod from "../PoolDisplayByMod";
import TargetSelector from "./TargetSelector";

export default async function PlayerPool({ searchParams }) {
   const stringParams = await searchParams;
   const modeParam: GameMode | "4k" | "7k" = ["osu", "fruits", "mania", "taiko", "4k", "7k"].includes(
      stringParams.m
   )
      ? stringParams.m
      : "osu";
   let mode = modeParam;
   let keyCount = 0;
   if (mode === "4k" || mode === "7k") {
      keyCount = mode === "7k" ? 7 : 4;
      mode = "mania";
   }
   const rating: number = parseInt(stringParams.r) || 1500;
   const rd: number = parseInt(stringParams.d) || 125;
   const { maps: maplist } = await getMappool({ rating, rd }, mode, keyCount);

   return (
      <div>
         <TargetSelector initRating={rating} initMode={modeParam} />
         <hr />
         <PoolDisplayByMod
            title={`Pool for: ${mode}${keyCount ? keyCount : ""} ${rating} rd${rd}`}
            target={rating}
            maplist={maplist}
            mode={mode}
         />
      </div>
   );
}
