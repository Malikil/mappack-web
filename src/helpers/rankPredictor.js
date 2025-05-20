// How much PP does the rank 10k player have?
const PP_EQUIVALENT = {
   osu: 9036,
   taiko: 5922, // 5k rank
   fruits: 8295, // 1k rank
   mania: 7246 // 4 key
};

/**
 * @param {number} pp
 * @param {import("osu-web.js").GameMode} mode
 */
export function convertPP(pp, mode = "osu") {
   const ppmod = PP_EQUIVALENT[mode];
   // Below 1000 PP, rating == pp
   if (pp < 1000) return pp;
   // Between 1000 and 10k rank (pp value), linearly scale so 10k == 2000 rating
   else if (pp < ppmod) return 1000 * ((pp - 1000) / (ppmod - 1000) + 1);
   // Afterwards logarithmically scale up from 2000 rating
   else return 1000 * (Math.log(pp / 1000) / Math.log(ppmod / 1000) + 1);
}
