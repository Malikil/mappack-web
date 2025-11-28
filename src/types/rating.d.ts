export interface Rating {
   rating: number;
   rd: number;
   vol: number;
};

export type ManiaMod = "nm" | "dt";
export type SimpleMod = ManiaMod | "hd" | "hr";
export type ModPool = SimpleMod | "fm";
