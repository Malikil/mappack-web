import { GameMode, Mod } from "osu-web.js";
import { ModPool, SimpleMod } from "./rating";
import { ScoreParser } from "@/helpers/scorev1";

export type FreemodSelection = "hd" | "hr" | "hdhr";

export interface SongResultMap {
   map: number;
   modpool: ModPool;
}

export interface MpLobbyResults {
   mp: number;
   mode: GameMode;
   warmups: number;
   maps: SongResultMap[];
   winnerScores: {
      score: number;
      mods?: Mod[];
   }[];
   loserScores: {
      score: number;
      mods?: Mod[];
   }[];
   winnerId: number;
   loserId: number;
}

export interface TeamMpLobbyResults extends MpLobbyResults {
   winnerId: "Red" | "Blue";
   loserId: "Red" | "Blue";
   individualMatchups: {
      players: [number, number];
      pointDiff: number;
   }[];
   individualScores: {
      player: number;
      map: number;
      score: ScoreParser;
      mods: Mod[];
   }[];
   redTeam: number[];
   blueTeam: number[];
}

export interface PveLobbyResults {
   matches: {
      [userid: number]: {
         map: number;
         mods: Mod[];
         score: ScoreParser;
         mode: GameMode;
      }[];
   };
   maps: Partial<Record<GameMode, Set<number>>>;
   mp: number;
}
