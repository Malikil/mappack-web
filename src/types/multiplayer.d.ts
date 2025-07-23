import { ModPool } from "./rating";

export type FreemodSelection = 'hd' | 'hr' | 'hdhr';

export interface SongResultMap {
   map: number;
   mod: ModPool;
}

export interface MpLobbyResults {
   mp: number;
   maps: SongResultMap[];
   winnerScores: [number, FreemodSelection][];
   loserScores: [number, FreemodSelection][];
   winnerId: number;
   loserId: number;
}
