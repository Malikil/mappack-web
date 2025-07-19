import { BeatmapVersion } from "./mappool";

export interface DbBeatmap extends BeatmapVersion {
   _id: number;
   artist: string;
   title: string;
   mapper: string;
   noteCount: {
      circles: number;
      sliders: number;
   };
}
