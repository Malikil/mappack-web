import { GameMode, Mod } from "osu-web.js";

export interface PracticePool {
   name: string;
   maps: {
      id: number;
      mods?: Mod[];
      scores: {
         [playerid: number]: number[];
      };
   }[];
}

export interface DbTeam {
   name: string;
   mode: GameMode;
   teamSize: number;
   players: {
      id: number;
      osuname: string;
      pending: boolean;
   }[];
   pools: PracticePool[];
}

export type Team = DbTeam & { _id: string };
