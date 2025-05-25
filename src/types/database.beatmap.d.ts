import { GameMode } from "osu-web.js";
import { ModRatings, Rating } from "./rating";
import { BeatmapVersion } from "./mappool";

/**
 * @deprecated Use ModRatings
 */
export interface RatingSet {
   nm: Rating;
   hd: Rating;
   hr: Rating;
   dt: Rating;
}

export type MappackActiveState = "pending" | "fresh" | "stale" | "completed";

export interface DbBeatmap extends BeatmapVersion {
   artist: string;
   title: string;
   mapper: string;
   noteCount: {
      circles: number;
      sliders: number;
   };
}

export interface DbMappack {
   name: string;
   download: string;
   maps: DbBeatmap[];
   active: MappackActiveState;
   mode: GameMode;
}
