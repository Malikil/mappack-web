import { GameMode, Mod } from "osu-web.js";
import { teamsDb } from "../connection";

export async function updateTeamScoreHistory(
   practicePoolUpdates: {
      player: number;
      mode: GameMode;
      map: number;
      mods: Mod[];
      score: number;
   }[]
) {
   const practicePoolDbResult = await teamsDb.bulkWrite(
      practicePoolUpdates.map(ppu => {
         const nomod = ppu.mods.length < 1;
         return {
            updateMany: {
               filter: {
                  players: {
                     $elemMatch: {
                        id: ppu.player,
                        $or: [{ pending: false }, { pending: { $exists: false } }]
                     }
                  },
                  "pools.maps.id": ppu.map
               },
               update: {
                  $push: {
                     [`pools.$[pool].maps.$[map].scores.${ppu.player}`]: ppu.score
                  }
               },
               arrayFilters: [
                  { "pool.maps.id": ppu.map },
                  {
                     "map.id": ppu.map,
                     $or: [
                        { "map.mods": null },
                        { "map.mods": { $exists: false } },
                        nomod
                           ? { "map.mods": { $size: 0 } }
                           : {
                                $and: [
                                   { "map.mods": { $all: ppu.mods } },
                                   { "map.mods": { $size: ppu.mods.length } }
                                ]
                             }
                     ]
                  }
               ]
            }
         };
      })
   );
   console.log("Practice pool results", practicePoolDbResult);
}
