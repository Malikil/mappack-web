import type { Mod } from "osu-web.js";
import type { Rating } from "../rating";

export type ModRatings = Partial<Record<Mod, number>>;

export interface DbBeatmapBase {
   _id: number;
   setid: number;
   version: string;
   length: number;
   bpm: number;
   artist: string;
   title: string;
   mapper: string;
   maxCombo: number;
   noteCount: {
      circles: number;
      sliders: number;
   };
   lastQuery: Date;
   styles: number[];
   mods: ModRatings;
   rating: Rating;
   ranked: number;
}

export interface OsuBeatmap extends DbBeatmapBase {
   cs: number;
   ar: number;
   od: number;
   stars: {
      nm: number;
      hd: number;
      hr: number;
      dt: number;
   };
}

export interface FruitsBeatmap extends DbBeatmapBase {
   cs: number;
   ar: number;
   stars: {
      nm: number;
      hr: number;
      dt: number;
   };
   convert?: boolean;
   dtb?: boolean;
}

export interface ManiaBeatmap extends DbBeatmapBase {
   keys: number;
   od: number;
   stars: {
      nm: number;
      dt: number;
   };
}

export interface TaikoBeatmap extends DbBeatmapBase {
   od: number;
   stars: {
      nm: number;
      hr: number;
      dt: number;
   };
}

export type AnyBeatmapType = OsuBeatmap | FruitsBeatmap | ManiaBeatmap | TaikoBeatmap;
export type BeatmapByMode = {
   osu: OsuBeatmap;
   taiko: TaikoBeatmap;
   fruits: FruitsBeatmap;
   mania: ManiaBeatmap;
};
