"use server";

import db from "@/app/api/db/connection";
import { Glicko2 } from "glicko2";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { matchResultValue, parseMpLobby } from "./functions";

export async function submitPve(formData) {
   const session = await auth();
   const matches = await parseMpLobby(formData.get("mp"));
   if (!matches || Object.keys(matches).length < 1)
      return {
         http: {
            status: 400,
            message: "No songs found"
         }
      };
   console.log(matches);
   // Create the rating calculator
   const calculator = new Glicko2();

   // Get the maps from database
   const mapsdb = db.collection("maps");
   const mappack = await mapsdb.findOne({ active: "current" });
   const matchedOutcomes = matches.map(match => {
      const playedMap = mappack.maps.find(m => m.id === match.map);
      const mapRating = playedMap.ratings[match.mod];
      match.map = {
         id: playedMap.id,
         setid: playedMap.setid,
         version: playedMap.version
      };
      return {
         match,
         mapRating: calculator.makePlayer(mapRating.rating, mapRating.rd, mapRating.vol)
      };
   });

   // Get the player's current rating
   const playersdb = db.collection("players");
   const player = await playersdb.findOne({
      osuid: parseInt(formData.get("player")) || session.user.id
   });
   const playerCalc = calculator.makePlayer(player.pve.rating, player.pve.rd, player.pve.vol);

   // Create mathes for the calculator
   const calculatorMatches = matchedOutcomes.map(match => [
      playerCalc,
      match.mapRating,
      matchResultValue(match.match.score)
   ]);

   // Update matches
   calculator.updateRatings(calculatorMatches);

   // Save results to database
   const result = await playersdb.updateOne(
      { osuid: player.osuid },
      {
         $set: {
            "pve.rating": playerCalc.getRating(),
            "pve.rd": playerCalc.getRd(),
            "pve.vol": playerCalc.getVol()
         },
         $inc: { "pve.games": 1 },
         $push: {
            "pve.matches": {
               $each: [
                  {
                     prevRating: player.pve.rating,
                     ratingDiff: playerCalc.getRating() - player.pve.rating,
                     songs: matchedOutcomes.map(m => m.match)
                  }
               ],
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
                  "maps.id": outcome.match.map.id
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

   revalidatePath("/profile");
}
