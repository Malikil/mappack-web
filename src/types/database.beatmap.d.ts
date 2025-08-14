import { GameMode } from "osu-web.js";
import { BeatmapVersion } from "./mappool";
import { ManiaMod, ModRatings, Rating, SimpleMod } from "./rating";

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

export interface OsuBeatmap extends DbBeatmap {
   ratings: ModRatings<SimpleMod>;
}

export interface CatchBeatmap extends DbBeatmap {
   ratings: ModRatings<SimpleMod>;
   convert: boolean;
}

export interface ManiaBeatmap extends DbBeatmap {
   ratings: ModRatings<ManiaMod>;
}

export type ModeCollectionMap = {
   osu: OsuBeatmap;
   taiko: OsuBeatmap;
   fruits: CatchBeatmap;
   mania: ManiaBeatmap;
};
export type AnyBeatmap = OsuBeatmap | CatchBeatmap | ManiaBeatmap;
