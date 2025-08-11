import { GameMode } from "osu-web.js";
import { ModPool, Rating, SimpleMod } from "./rating";

export interface MatchHistoryMap {
   id: number;
   setid: number;
   version: string;
}

export interface MatchHistoryResult {
   map: MatchHistoryMap;
   mod: SimpleMod;
   score: number;
}
export interface PvPMatchHistoryResult extends MatchHistoryResult {
   mod: ModPool;
   opponentScore: number;
}

export interface MatchHistory {
   mp: number;
   prevRating: number;
   ratingDiff: number;
   songs: MatchHistoryResult[];
}
export interface MatchHistoryOpponent {
   id: number;
   name: string;
   rating: number;
}
export interface PvPMatchHistory extends MatchHistory {
   songs: PvPMatchHistoryResult[];
   opponent: MatchHistoryOpponent;
}

export interface PvPInfo extends Rating {
   matches: PvPMatchHistory[];
   losses: number;
   wins: number;
}

export interface PvEInfo extends Rating {
   matches: MatchHistory[];
   games: number;
   songs: number;
   bestPlays: (MatchHistoryResult & {
      player: Rating;
   })[];
}

export interface ModeInfo {
   pvp?: PvPInfo;
   pve: PvEInfo;
}

export interface DbPlayer extends Record<GameMode, ModeInfo> {
   osuid: number;
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