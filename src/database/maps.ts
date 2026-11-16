import { BeatmapByMode } from "@/types/database/beatmap";
import { Filter } from "mongodb";
import { GameMode } from "osu-web.js";
import { mapsDb } from "./connection";

export async function findMaps<M extends GameMode>(
   mode: M,
   filter: Filter<BeatmapByMode[M]>
): Promise<BeatmapByMode[M][]> {
   return (await mapsDb[mode].find(filter).toArray()) as BeatmapByMode[M][];
}
