"use server";

import db from "@/app/api/db/connection";
import { Glicko2, Player } from "glicko2";
import { revalidatePath } from "next/cache";
import { matchResultValue, parseMpLobby } from "./functions";
import { withinRange } from "@/helpers/rating-range";

export async function generateAttack(osuid) {
   const playersDb = db.collection("players");
   const player = await playersDb.findOne({ osuid });
   console.log(`Target range: ${player.pve.rating.toFixed(1)} ±${player.pve.rd.toFixed(1)}`);
   const mapsDb = db.collection("maps");
   const mappack = await mapsDb.findOne({ active: "current" });
   let availableMaps = mappack.maps
      .flatMap(map =>
         Object.keys(map.ratings).map(mod => ({
            id: map.id,
            mod,
            rating: map.ratings[mod]
         }))
      )
      .filter(map => withinRange(player.pve, map.rating));
   console.log(`${availableMaps.length} available maps`);

   const selectedMaps = Array.from({ length: 7 }, () => {
      if (availableMaps.length < 1) return;
      const index = (Math.random() * availableMaps.length) | 0;
      const selected = availableMaps[index];
      availableMaps = availableMaps.filter(m => m.id !== selected.id);
      return selected;
   }).filter(v => v);
   console.log(selectedMaps);

   return selectedMaps.map(m => `${m.id}+${m.mod.toUpperCase()}`);
}

export async function submitPve(formData) {
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
   /**
    * @type {{
    *   id: number,
    *   setid: number,
    *   version: string,
    *   ratings: {
    *     nm: {
    *       calc: Player,
    *       played: boolean
    *     },
    *     hd: {
    *       calc: Player,
    *       played: boolean
    *     },
    *     hr: {
    *       calc: Player,
    *       played: boolean
    *     },
    *     dt: {
    *       calc: Player,
    *       played: boolean
    *     }
    *   },
    *   played: boolean
    * }[]}
    */
   const fullMaplistForCalculator = mappack.maps.map(map => ({
      // Create rating objects for each map here, then flag them as (un)played for updating later
      id: map.id,
      setid: map.setid,
      version: map.version,
      ratings: {
         nm: {
            calc: calculator.makePlayer(
               map.ratings.nm.rating,
               map.ratings.nm.rd,
               map.ratings.nm.vol
            ),
            played: false
         },
         hd: {
            calc: calculator.makePlayer(
               map.ratings.hd.rating,
               map.ratings.hd.rd,
               map.ratings.hd.vol
            ),
            played: false
         },
         hr: {
            calc: calculator.makePlayer(
               map.ratings.hr.rating,
               map.ratings.hr.rd,
               map.ratings.hr.vol
            ),
            played: false
         },
         dt: {
            calc: calculator.makePlayer(
               map.ratings.dt.rating,
               map.ratings.dt.rd,
               map.ratings.dt.vol
            ),
            played: false
         }
      },
      played: false
   }));
   /** @type {[Player, Player, number][]} */
   const calculatorResults = [];
   // For each player, create matchups for them
   const playersdb = db.collection("players");
   const playerCalculatorPairs = (
      await Promise.all(
         // This can be parallel given that no data is being written to db. Only fetched.
         // The order of items in the matchups object also doesn't matter
         // And when a map is marked as played, it is simply switching from false to true. Nothing
         // will switch it back to false ever
         Object.keys(matches).map(async playerIdKey => {
            // Sanity check: Only update a player if one of their maps is on the maplist
            // If none of their maps are on the list, exit early
            if (
               matches[playerIdKey].every(a => !fullMaplistForCalculator.find(b => b.id === a.map))
            )
               return;
            // Get the player's current rating
            const playerId = parseInt(playerIdKey);
            const player = await playersdb.findOneAndUpdate(
               { osuid: playerId },
               {
                  $setOnInsert: {
                     osuname: `#${playerIdKey}`,
                     pvp: {
                        rating: 1500,
                        rd: 350,
                        vol: 0.06,
                        matches: [],
                        wins: 0,
                        losses: 0
                     },
                     pve: {
                        rating: 1500,
                        rd: 350,
                        vol: 0.06,
                        matches: [],
                        games: 0
                     },
                     hideLeaderboard: true
                  }
               },
               { upsert: true, returnDocument: "after" }
            );
            const playerCalc = calculator.makePlayer(
               player.pve.rating,
               player.pve.rd,
               player.pve.vol
            );
            const history = {
               prevRating: player.pve.rating,
               ratingDiff: 0,
               songs: []
            };
            // Find the appropriate rating object from the maplist
            matches[playerIdKey].forEach(songResult => {
               const mapCalc = fullMaplistForCalculator.find(m => m.id === songResult.map);
               // The song results aren't filtered yet to current maps
               // Only handle known maps
               if (mapCalc) {
                  // Set the map as played
                  mapCalc.played = true;
                  mapCalc.ratings[songResult.mod].played = true;
                  // Create the match result
                  calculatorResults.push([
                     playerCalc,
                     mapCalc.ratings[songResult.mod].calc,
                     matchResultValue(songResult.score)
                  ]);
                  // Add the song to history
                  history.songs.push({
                     map: {
                        id: mapCalc.id,
                        setid: mapCalc.setid,
                        version: mapCalc.version
                     },
                     mod: songResult.mod,
                     score: songResult.score
                  });
               }
            });

            return { playerId, playerCalc, history };
         })
      )
   ).filter(v => v);

   // Update matches
   calculator.updateRatings(calculatorResults);

   // Save results to database
   const playersDbWriteResult = await playersdb.bulkWrite(
      playerCalculatorPairs.map(({ playerId, playerCalc, history }) => {
         const updatedRating = playerCalc.getRating();
         history.ratingDiff = updatedRating - history.prevRating;
         return {
            updateOne: {
               filter: { osuid: playerId },
               update: {
                  $set: {
                     "pve.rating": updatedRating,
                     "pve.rd": playerCalc.getRd(),
                     "pve.vol": playerCalc.getVol()
                  },
                  $inc: { "pve.games": 1 },
                  $push: {
                     "pve.matches": {
                        $each: [history],
                        $position: 0,
                        $slice: 5
                     }
                  }
               }
            }
         };
      })
   );
   console.log("Players", playersDbWriteResult);

   // Figure out which maps to update
   const updateMaps = fullMaplistForCalculator.filter(map => map.played);
   const mapsDbWriteResult = await mapsdb.bulkWrite(
      updateMaps.map(mapInfo => {
         const setObject = Object.fromEntries(
            Object.keys(mapInfo.ratings)
               .filter(k => mapInfo.ratings[k].played)
               .map(k => {
                  /** @type {Player} */
                  const modRating = mapInfo.ratings[k].calc;
                  return [
                     `maps.$.ratings.${k}`,
                     {
                        rating: modRating.getRating(),
                        rd: modRating.getRd(),
                        vol: modRating.getVol()
                     }
                  ];
               })
         );
         return {
            updateOne: {
               filter: {
                  active: "current",
                  "maps.id": mapInfo.id
               },
               update: {
                  $set: setObject
               }
            }
         };
      })
   );
   console.log("Maps", mapsDbWriteResult);

   revalidatePath("/profile");
}
