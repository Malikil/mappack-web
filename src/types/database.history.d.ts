import { GameMode } from "osu-web.js";

export type DbHistory =
   | {
        _id: string;
        type: "string";
        items: string[];
     }
   | {
        _id: string;
        type: "number";
        items: number[];
     };
