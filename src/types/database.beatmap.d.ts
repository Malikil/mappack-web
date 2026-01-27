import { GameMode, Mod } from "osu-web.js";
import { BeatmapVersion } from "./mappool";
import { ManiaMod, Rating, SimpleMod } from "./rating";

export type ModRatings = Partial<Record<Mod, number>>;

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
   styles: number[];
   mods: ModRatings;
   rating: Rating;
}
