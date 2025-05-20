export interface Rating {
   rating: number;
   rd: number;
   vol: number;
};

export type SimpleMod = "nm" | "hd" | "hr" | "dt";
export type ModPool = SimpleMod | "fm";

export interface ModRatings extends Record<SimpleMod, Rating> {}
