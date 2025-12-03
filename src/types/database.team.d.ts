import { Mod } from "osu-web.js";

export interface DbTeam {
   name: string;
   players: {
      id: number;
      osuname: string;
      pending: boolean;
   }[];
   pools: {
      name: string;
      maps: {
         id: number;
         mods?: Mod[];
         scores: {
            [playerid: number]: number[];
         };
      }[];
   }[];
}
