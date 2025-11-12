import { GameMode } from "osu-web.js";
import { ModPool } from "./rating";
import { ScoreParser } from "@/helpers/scorev1";

export type FreemodSelection = "hd" | "hr" | "hdhr";

export interface SongResultMap {
   map: number;
   mod: ModPool;
}

export interface MpLobbyResults {
   mp: number;
   mode: GameMode;
   warmups: number;
   maps: SongResultMap[];
   winnerScores: [number, FreemodSelection][];
   loserScores: [number, FreemodSelection][];
   winnerId: number;
   loserId: number;
}

export interface PveLobbyResults {
   matches: {
      [userid: number]: {
         map: number;
         mod: SimpleMod;
         score: ScoreParser;
         mode: GameMode;
      }[];
   };
   maps: Partial<Record<GameMode, Set<number>>>;
   mp: number;
}
