"use server";

import db from "@/app/api/db/connection";
import { verify } from "../../functions";
import { Glicko2 } from "glicko2";

export async function submitPve(formData) {
   const session = await verify();
   /** @type {string} */
   const matchesText = formData.get("history");
   const matches = matchesText.split("\n").map(ln => {
      const items = ln.split(" ");
      const [map, mod] = items[0].split("+");
      return {
         map: parseInt(map),
         mod: mod.toLowerCase(),
         score: parseInt(items[1])
      };
   });
   console.log(matches);

   // Create the rating calculator
   const calculator = new Glicko2();

   // Get the maps from database
   const mapsdb = db.collection("maps");
   const mappack = await mapsdb.findOne({ active: "current" });
   const matchedOutcomes = matches.map(match => {
      const playedMap = mappack.maps.find(m => m.id === match.map);
      const mapRating = playedMap.ratings[match.mod];
      return {
         match,
         mapRating: calculator.makePlayer(mapRating.rating, mapRating.rd, mapRating.vol)
      };
   });

   // Get the player's current rating
   const playersdb = db.collection("players");
   const player = await playersdb.findOne({ osuid: session.user.id });
   const playerCalc = calculator.makePlayer(player.pve.rating, player.pve.rd, player.pve.vol);

   // Create mathes for the calculator
   const calculatorMatches = matchedOutcomes.map(match => {
      const target = 600000;
      // Use a sliding scale
      const diff = match.match.score - target;
      // Above 980k and below 230k are capped with this scaling factor
      const scaledDiff = diff / 750000;
      // "tie" should move from 0 to 0.5
      const centeredDiff = scaledDiff + 0.5;
      // Clamp between [0, 1]
      const matchScore = Math.max(0, Math.min(1, centeredDiff));
      return [playerCalc, match.mapRating, matchScore];
   });

   // Update matches
   calculator.updateRatings(calculatorMatches);

   // Save results to database
   const result = await playersdb.updateOne(
      { osuid: session.user.id },
      {
         $set: {
            "pve.rating": playerCalc.getRating(),
            "pve.rd": playerCalc.getRd(),
            "pve.vol": playerCalc.getVol()
         },
         $inc: { "pve.games": 1 },
         $push: {
            "pve.matches": {
               $each: [matches],
               $position: 0,
               $slice: 5
            }
         }
      }
   );
   console.log(result);

   const mapsResult = await mapsdb.bulkWrite(
      matchedOutcomes.map(outcome => {
         const ratingField = `maps.$.ratings.${outcome.match.mod}`;
         const updatedRating = {
            rating: outcome.mapRating.getRating(),
            rd: outcome.mapRating.getRd(),
            vol: outcome.mapRating.getVol()
         };
         return {
            updateOne: {
               filter: {
                  active: "current",
                  "maps.id": outcome.match.map
               },
               update: {
                  $set: {
                     [ratingField]: updatedRating
                  }
               }
            }
         };
      })
   );
   console.log(mapsResult);
}
