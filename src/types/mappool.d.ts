import React from "react";
import { ModRatings } from "./rating";

export interface BeatmapVersion {
   _id: number;
   setid: number;
   version: string;
   length: number;
   bpm: number;
   cs: number;
   ar: number;
   od: number;
   stars: number;
}

export interface MapAction {
   title: string;
   action: ((beatmap: BeatmapVersion) => void) | React.JSX.Element;
   condition?: (beatmap: BeatmapVersion) => boolean;
}
