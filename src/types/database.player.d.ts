import { GameMode } from "osu-web.js";
import { ModPool, Rating, SimpleMod } from "./rating";

export interface MatchHistoryMap {
   id: number;
   setid: number;
   version: string;
}

export interface MatchHistorySong {
   map: MatchHistoryMap;
   mod: string;
   score: number;
}
export interface PvEMatchHistorySong extends MatchHistorySong {
   mod: SimpleMod;
}
export interface PvPMatchHistorySong extends MatchHistorySong {
   mod: ModPool;
   opponentScore: number;
}

export interface MatchHistory {
   mp: number;
   prevRating: number;
   ratingDiff: number;
   songs: MatchHistorySong[];
}
export interface MatchHistoryOpponent {
   id?: number;
   name: string;
   rating: number;
}
export interface PvEMatchHistory extends MatchHistory {
   songs: PvEMatchHistorySong[];
}
export interface PvPMatchHistory extends MatchHistory {
   songs: PvPMatchHistorySong[];
   opponent: MatchHistoryOpponent;
   warmups?: number;
}

export interface PvPInfo extends Rating {
   matches: PvPMatchHistory[];
   losses: number;
   wins: number;
}

export interface PvEInfo extends Rating {
   matches: PvEMatchHistory[];
   games: number;
   songs: number;
}

export interface PracticePool {
   name: string;
   maps: {
      id: number;
      mod: ModPool;
      scores: number[];
   }[];
}

export interface ModeInfo {
   pvp?: PvPInfo;
   pve: PvEInfo;
   styles: number[];
   pools: PracticePool[];
}

export interface DbPlayer extends Record<GameMode, ModeInfo> {
   _id: number;
   osuname: string;
   admin?: boolean;
   hideLeaderboard?: boolean;
   gamemode?: GameMode;
}

type WithRank<T extends Rating> = T & { rank?: number };
type RankedPlayer<T extends DbPlayer, K extends GameMode> = Omit<T, K> & {
   [P in K]: T[P] & {
      pvp?: WithRank<T[P]["pvp"]>;
      pve: WithRank<T[P]["pve"]>;
   };
};