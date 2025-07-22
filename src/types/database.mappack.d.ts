import { GameMode } from "osu-web.js";
//import { DbBeatmap } from "./database.beatmap";

export type MappackActiveState = "pending" | "fresh" | "stale" | "completed";

export interface DbMappack {
   name: string;
   download: string;
   maps: number[];
   active: MappackActiveState;
   mode: GameMode;
}
