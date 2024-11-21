export interface MatchHistoryMap {
   id: number;
   setid: number;
   version: string;
}

export interface PvEMatchHistorySong {
   map: MatchHistoryMap;
   mod: 'nm'|'hd'|'hr'|'dt';
   score: number;
}

export interface PvEMatchHistory {
   prevRating: number;
   ratingDiff: number;
   songs: PvEMatchHistorySong[]
}