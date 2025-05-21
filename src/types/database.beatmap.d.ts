import { GameMode } from "osu-web.js";
import { ModRatings, Rating } from "./rating";

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

export interface BeatmapVersion {
   id: number;
   setid: number;
   version: string;
   length: number;
   bpm: number;
   cs: number;
   ar: number;
   od: number;
   stars: number;
   ratings: ModRatings;
}

export interface DbBeatmap extends BeatmapVersion {
   artist: string;
   title: string;
   mapper: string;
}

export interface DbMappack {
   name: string;
   download: string;
   maps: DbBeatmap[];
   active: MappackActiveState;
   mode: GameMode;
}
