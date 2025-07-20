import { GameMode } from "osu-web.js";
import { BeatmapVersion } from "./mappool";

export interface DbBeatmap extends BeatmapVersion {
   artist: string;
   title: string;
   mapper: string;
   mode: GameMode;
   noteCount: {
      circles: number;
      sliders: number;
   };
}
