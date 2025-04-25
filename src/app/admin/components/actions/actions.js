"use server";

import { Glicko2 } from "glicko2";

const ZWII_PP = 9044;
const MALI_PP = 5643;
const FOUW_PP = 5402;
const NANH_PP = 4863;
const PP_EQUIVALENT = 8999;

const convertPP = pp => {
   // Below 1000 PP, rating == pp
   if (pp < 1000) return pp;
   // Between 1000 and 10000 pp, linearly scale so 10000pp == 2000 rating
   else if (pp < PP_EQUIVALENT) return 1000 * ((pp - 1000) / (PP_EQUIVALENT - 1000) + 1);
   //else if (pp < 10000) return 1000 + (pp - 1000) / 9;
   // Afterwards logarithmically scale up from 2000 rating
   else return 1000 * (Math.log(pp / 1000) / Math.log(PP_EQUIVALENT / 1000) + 1);
   //else return (500 * Math.log(pp)) / Math.log(10);
};

export async function debug() {
   console.log("Make calc");
   const calculator = new Glicko2();
   console.log("Add players");
   let mali = calculator.makePlayer(convertPP(MALI_PP), 175, 0.06);
   let fouweior = calculator.makePlayer(convertPP(FOUW_PP), 175, 0.06);
   console.log(
      `Init  : Mali ${mali.getRating().toFixed(2)} | Fouw ${fouweior.getRating().toFixed(2)}`
   );
   calculator.updateRatings([[mali, fouweior, 1]]);
   console.log(
      `Game 1:      ${mali.getRating().toFixed(2)} |      ${fouweior.getRating().toFixed(2)}`
   );
   calculator.updateRatings([[fouweior, mali, 1]]);
   console.log(
      `Game 2:      ${mali.getRating().toFixed(2)} |      ${fouweior.getRating().toFixed(2)}`
   );
   calculator.removePlayers();
   mali = calculator.makePlayer(mali.getRating(), mali.getRd(), mali.getVol());
   let nanhira = calculator.makePlayer(convertPP(NANH_PP), 175, 0.06);
   console.log(
      `Init  : Mali ${mali.getRating().toFixed(2)} | Nanh ${nanhira.getRating().toFixed(2)}`
   );
   calculator.updateRatings([[mali, nanhira, 1]]);
   console.log(
      `Game 3:      ${mali.getRating().toFixed(2)} |      ${nanhira.getRating().toFixed(2)}`
   );
   calculator.removePlayers();
   mali = calculator.makePlayer(mali.getRating(), mali.getRd(), mali.getVol());
   let zwii = calculator.makePlayer(convertPP(ZWII_PP), 175, 0.06);
   console.log(`Init  : Mali ${mali.getRating().toFixed(2)} | zwii ${zwii.getRating().toFixed(2)}`);
   calculator.updateRatings([[zwii, mali, 1]]);
   console.log(`Game 4:      ${mali.getRating().toFixed(2)} |      ${zwii.getRating().toFixed(2)}`);
   console.log("\nzwii", zwii.getRating(), zwii.getRd(), zwii.getVol());
   console.log("fouw", fouweior.getRating(), fouweior.getRd(), fouweior.getVol());
   console.log("mali", mali.getRating(), mali.getRd(), mali.getVol());
   console.log("nanh", nanhira.getRating(), nanhira.getRd(), nanhira.getVol());
}
