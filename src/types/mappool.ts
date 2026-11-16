import React from "react";
import { DbBeatmapBase } from "./database/beatmap";

export interface MapAction {
   title: string;
   action: ((beatmap: DbBeatmapBase) => void) | React.JSX.Element;
   condition?: (beatmap: DbBeatmapBase) => boolean;
}
