import { GameMode } from "osu-web.js";
import { BeatmapVersion } from "./mappool";
import { Rating } from "./rating";

export interface DbBeatmap extends BeatmapVersion {
   artist: string;
   title: string;
   mapper: string;
   maxCombo: number;
   noteCount: {
      circles: number;
      sliders: number;
   };
   lastUpdate?: Date;
   lastQuery?: Date;
   matchmakingUntil?: Date;
}

export interface CatchBeatmap extends DbBeatmap {
   convert: boolean;
}

export interface ManiaBeatmap extends Omit<DbBeatmap, "ratings"> {
   ratings: {
      nm: Rating;
      dt: Rating;
   };
}

export type ModeCollectionMap = {
   osu: DbBeatmap;
   taiko: DbBeatmap;
   fruits: CatchBeatmap;
   mania: ManiaBeatmap;
};
export type AnyBeatmap = DbBeatmap | CatchBeatmap | ManiaBeatmap;
