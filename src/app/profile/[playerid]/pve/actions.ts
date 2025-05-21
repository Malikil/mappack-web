"use server";

import db from "@/app/api/db/connection";
import { Glicko2, Player } from "glicko2";
import { revalidatePath } from "next/cache";
import { matchResultValue, parseMpLobby } from "./functions";
import { withinRange } from "@/helpers/rating-range";
import { getCurrentPack } from "@/helpers/currentPack";
import { auth } from "@/auth";
import { SimpleMod } from "@/types/rating";
import { DbPlayer, ModeInfo, PvEMatchHistory } from "@/types/database.player";
import { DbBeatmap } from "@/types/database.beatmap";

export async function generateAttack(osuid: number, mapcount = 7) {
   const playersDb = db.collection<DbPlayer>("players");
   const player = await playersDb.findOne({ osuid });
   const pveStats = player[player.gamemode]?.pve;
   console.log(`Target range: ${pveStats.rating.toFixed(1)} ±${pveStats.rd.toFixed(1)}`);
   const packMaps = await getCurrentPack(player.gamemode || "osu");
   let availableMaps = packMaps
      .flatMap(map =>
         Object.keys(map.ratings).map((mod: SimpleMod) => ({
            id: map.id,
            setid: map.setid,
            mod,
            rating: map.ratings[mod]
         }))
      )
      .filter(map => withinRange(pveStats, map.rating));
   console.log(`${availableMaps.length} available maps`);

   const selectedMaps = Array.from({ length: mapcount }, () => {
      if (availableMaps.length < 1) return;
      const index = (Math.random() * availableMaps.length) | 0;
      const selected = availableMaps[index];
      availableMaps = availableMaps.filter(m => m.setid !== selected.setid);
      return selected;
   }).filter(v => v);
   console.log(selectedMaps);

   return selectedMaps.map(m => `${m.id}+${m.mod.toUpperCase()}`);
}

export async function submitPve(formData: FormData, matchesData: {
    results: {
        [user_id: string]: {
            map: number;
            mod: SimpleMod;
            score: number;
        }[];
    };
    mp: number;
}) {
   const { results: matches, mp } = formData ? await parseMpLobby(formData.get("mp").toString()) : matchesData;
   if (!matches || Object.keys(matches).length < 1)
      return {
         http: {
            status: 400,
            message: "No songs found"
         }
      };
   console.log(matches);
   const session = await auth();
   const playersdb = db.collection<DbPlayer>("players");
   const mode = (await playersdb.findOne({ osuid: session.user.id })).gamemode || "osu";
   // Create the rating calculator
   const calculator = new Glicko2();

   // Get the maps from database
   const mapsdb = db.collection<DbBeatmap>("maps");
   const packMaps = await getCurrentPack(mode);
   const fullMaplistForCalculator = packMaps.map(map => ({
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
   const calculatorResults: [Player, Player, number][] = [];
   // For each player, create matchups for them
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
            const ratingSet: ModeInfo = {
               pve: {
                  rating: 1500,
                  rd: 350,
                  vol: 0.06,
                  matches: [],
                  games: 0,
                  songs: 0
               }
            };
            const player = await playersdb.findOneAndUpdate(
               { osuid: playerId },
               {
                  $setOnInsert: {
                     osuname: `#${playerIdKey}`,
                     osu: ratingSet,
                     fruits: ratingSet,
                     taiko: ratingSet,
                     mania: ratingSet,
                     hideLeaderboard: true
                  }
               },
               { upsert: true, returnDocument: "after" }
            );
            // This is about the earliest spot to check if the mp has already been used
            // Considering that at the moment the player setup depends on the maps being
            // already set up
            // Make sure the lobby hasn't been used in either pve or pvp
            if (
               player[mode].pve.matches.find(h => h.mp === mp) ||
               player[mode].pvp?.matches.find(h => h.mp === mp)
            )
               throw new Error("History already exists");
            const playerCalc = calculator.makePlayer(
               player[mode].pve.rating,
               player[mode].pve.rd,
               player[mode].pve.vol
            );
            const history: PvEMatchHistory = {
               mp,
               prevRating: player[mode].pve.rating,
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
                     matchResultValue(songResult.score, mode)
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
      ).catch<{ playerId: number, playerCalc: Player, history: PvEMatchHistory }[]>(err => { console.warn(err.message); return null; })
   )?.filter(v => v);
   if (!playerCalculatorPairs)
      return {
         http: {
            status: 400,
            message: "History already exists"
         }
      };

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
                     [`${mode}.pve.rating`]: updatedRating,
                     [`${mode}.pve.rd`]: playerCalc.getRd(),
                     [`${mode}.pve.vol`]: playerCalc.getVol()
                  },
                  $inc: {
                     [`${mode}.pve.games`]: 1,
                     [`${mode}.pve.songs`]: history.songs.length
                  },
                  $push: {
                     [`${mode}.pve.matches`]: {
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
               .map((k: SimpleMod) => {
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
                  $or: [{ active: "fresh" }, { active: "stale" }],
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
