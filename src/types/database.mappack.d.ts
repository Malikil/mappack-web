import { GameMode } from "osu-web.js";

export interface DbMappack {
   name: string;
   download: string;
   maps: number[];
   order: number;
   mode: GameMode;
}
