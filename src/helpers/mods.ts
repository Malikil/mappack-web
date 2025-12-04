import { Mod } from "osu-web.js";

const MODS = [
   "NF",
   "EZ",
   "TD",
   "HD",
   "HR",
   "SD",
   "DT",
   "RX",
   "HT",
   "NC",
   "FL",
   "AT",
   "SO",
   "AP",
   "PF",
   "4K",
   "5K",
   "6K",
   "7K",
   "8K",
   "FI",
   "RD",
   "CN",
   "TP",
   "K9",
   "KC",
   "1K",
   "3K",
   "2K",
   "MR",
   "DC",
   "BL",
   "ST",
   "AC",
   "DA",
   "CL",
   "AL",
   "SG",
   "TR",
   "WG",
   "SI",
   "GR",
   "DF",
   "WU",
   "WD",
   "TC",
   "BR",
   "AD",
   "MU",
   "NS",
   "MG",
   "RP",
   "AS",
   "FR",
   "BU",
   "SY",
   "DP",
   "SW",
   "FF",
   "DS",
   "IN",
   "CS",
   "HO",
   "9K"
];

/**
 * Parse a short mods combination as a string or array of strings.
 * Accepted string formats: "HDDT", "HD, DT", "HD DT". The amount of spaces doesn't matter. Allowed seperators are comma and spaces.
 * @param {string|string[]} input
 */
export function parseShortMods(input: string | string[]): Mod[] {
   let splits: string[] = [];
   if (Array.isArray(input)) splits = input;
   else if (typeof input == "string") {
      if (input.indexOf(",") != -1) splits = input.split(",");
      else if (input.indexOf(" ") != -1) splits = input.split(" ");
      else if (input.length % 2 == 0) {
         splits[0] = "";
         for (const char of input)
            if (splits[splits.length - 1].length < 2) splits[splits.length - 1] += char;
            else splits[splits.length] = char;
      } else return [];
   } else return [];

   const mods: Mod[] = [];
   for (let i = 0; i < splits.length; i++) {
      const shortMod = splits[i].trim().toUpperCase();
      if (shortMod && MODS.includes(shortMod)) mods.push(shortMod as Mod);
      else if (shortMod === 'FM') return null;
   }
   return mods.sort((a, b) => (a > b ? 1 : a < b ? -1 : 0));
}
