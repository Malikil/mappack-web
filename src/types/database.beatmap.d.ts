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

export interface DbBeatmap {
   id: number;
   setid: number;
   artist: string;
   title: string;
   version: string;
   mapper: string;
   length: number;
   bpm: number;
   cs: number;
   ar: number;
   stars: number;
   ratings: ModRatings;
}
