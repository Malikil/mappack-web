import { GameMode } from "osu-web.js";

// How much PP does the rank 10k player have?
const PP_EQUIVALENT = {
   osu: 9148,
   taiko: 6105, // 5k rank
   fruits: 8371, // 1k rank
   mania: 7456 // 4 key
};

export function convertPP(pp: number, mode: GameMode = "osu") {
   const ppmod = PP_EQUIVALENT[mode];
   // Below 1000 PP, rating == pp
   if (pp < 1000) return pp;
   // Between 1000 and 10k rank (pp value), linearly scale so 10k == 2000 rating
   else if (pp < ppmod) return 1000 * ((pp - 1000) / (ppmod - 1000) + 1);
   // Afterwards logarithmically scale up from 2000 rating
   else return 1000 * (Math.log(pp / 1000) / Math.log(ppmod / 1000) + 1);
}
