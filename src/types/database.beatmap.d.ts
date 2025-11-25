import { GameMode, Mod } from "osu-web.js";
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
   styles: number[];
   mods: Partial<Record<Mod, number>>;
   rating: Rating;
}
