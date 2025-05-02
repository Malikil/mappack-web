import { Rating } from "./rating";

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
   mod: "nm" | "hd" | "hr" | "dt";
}
export interface PvPMatchHistorySong extends MatchHistorySong {
   mod: "nm" | "hd" | "hr" | "dt" | "fm";
   opponentScore: number;
}

export interface MatchHistory {
   mp: number;
   prevRating: number;
   ratingDiff: number;
   songs: MatchHistorySong[];
}
export interface MatchHistoryOpponent {
   name: string;
   rating: number;
}
export interface PvEMatchHistory extends MatchHistory {
   songs: PvEMatchHistorySong[];
}
export interface PvPMatchHistory extends MatchHistory {
   songs: PvPMatchHistorySong[];
   opponent: MatchHistoryOpponent;
}

export interface PvPInfo extends Rating {
   matches: PvPMatchHistory[];
   losses: number;
   wins: number;
}

export interface PvEInfo extends Rating {
   matches: PvEMatchHistory[];
   games: number;
}

export interface DbPlayer {
   osuid: number;
   pvp: PvPInfo;
   pve: PvEInfo;
   osuname: string;
   admin?: boolean;
   hideLeaderboard?: boolean;
}
