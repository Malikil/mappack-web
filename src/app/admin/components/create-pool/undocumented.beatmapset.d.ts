import { Beatmap, Beatmapset, UserCompact } from "osu-web.js";

export interface UndocumentedBeatmapsetResponse extends Beatmapset {
   offset: number;
   spotlight: boolean;
   track_id: null;
   user_id: number;
   deleted_at: null;
   discussion_enabled: boolean;
   beatmaps: Beatmap[];
   converts: Beatmap[];
   current_nominations: object[];
   description: object;
   genre: object;
   language: object;
   pack_tags: string[];
   ratings: number[];
   recent_favourites: object[];
   related_users: object[];
   user: UserCompact;
}
