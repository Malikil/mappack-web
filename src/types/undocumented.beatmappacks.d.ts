import { Beatmapset } from "osu-web.js";

export interface UndocumentedBeatmappackCompact {
   author: string;
   date: string;
   name: string;
   no_diff_reduction: boolean;
   ruleset_id?: 1 | 2 | 3;
   tag: string;
   url: string;
}

export interface UndocumentedBeatmappackResponse {
   beatmap_packs: UndocumentedBeatmappackCompact[];
   cursor: { pack_id: number };
   cursor_string: string;
}

export interface UndocumentedBeatmappack extends UndocumentedBeatmappackCompact {
   beatmapsets: Beatmapset[];
}
