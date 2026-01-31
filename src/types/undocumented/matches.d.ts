import { BeatmapCompact, BeatmapsetCompact, Country, GameMode, Mod, Score, ScoringType, TeamType, UserCompact } from "osu-web.js";

export type MatchEventType = 'host-changed' | 'match-created' | 'match-disbanded' | 'other' | 'player-joined' | 'player-kicked' | 'player-left';

export interface MatchInfoRaw {
   id: number;
   start_time: string;
   end_time: string;
   name: string;
}
export interface MatchInfo {
   id: number;
   start_time: Date;
   end_time: Date;
   name: string;
}
export interface MatchGame {
   id: number;
   beatmap: BeatmapCompact & { beatmapset: BeatmapsetCompact };
   beatmap_id: number;
   start_time: string;
   end_time?: string;
   mode: GameMode;
   mode_int: number;
   mods: Mod[];
   scores: Score[];
   scoring_type: 'accuracy' | 'combo' | 'score' | 'scorev2';
   team_type: 'head-to-head' | 'tag-coop' | 'tag-team-vs' | 'team-vs';
}

export interface MatchEvent {
   id: number;
   detail: {
      type: MatchEventType;
      text: string;
   }
   timestamp: string;
   user_id?: number;
   game?: MatchGame;
}

export interface UndocumentedMatches {
   matches: MatchInfoRaw[];
   params: {
      limit: number;
      sort: 'id_desc' | 'id_asc';
      active: boolean;
   },
   cursor_string: string;
}

export interface UndocumentedMatchDetails {
   match: MatchInfoRaw;
   events: MatchEvent[];
   users: (UserCompact & { country: Country })[];
   first_event_id: number;
   latest_event_id: number;
}