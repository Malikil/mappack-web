import React from "react";
import { BeatmapVersion } from "./database.beatmap";

export interface MapAction {
   title: string;
   action: ((beatmap: BeatmapVersion) => void) | React.JSX.Element;
   condition?: (beatmap: BeatmapVersion) => boolean;
}
