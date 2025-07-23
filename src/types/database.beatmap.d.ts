import { GameMode } from "osu-web.js";
import { BeatmapVersion } from "./mappool";

export interface DbBeatmap extends BeatmapVersion {
   artist: string;
   title: string;
   mapper: string;
   mode: GameMode;
   maxCombo: number;
   noteCount: {
      circles: number;
      sliders: number;
   };
}
