"use server";

import { fruitsDb, maniaDb, osuDb, playersDb, taikoDb } from "@/app/api/db/connection";
import { parse1v1Lobby } from "@/app/api/db/pvp/functions";
import { auth } from "@/auth";
import { getOsuToken } from "@/helpers/osuToken";
import { getLobbyData } from "@/helpers/server/multiplayer";
import { convertTime, days, minutes } from "@/time";
import {
   MatchGame,
   MatchInfo,
   UndocumentedMatchDetails,
   UndocumentedMatches
} from "@/types/undocumented/matches";
import { Glicko2 } from "glicko2";
import { Client, GameMode, LegacyClient } from "osu-web.js";
import util from "util";

export async function debug() {
   const modes: GameMode[] = ["osu", "fruits", "taiko", "mania"];
   const plist = await playersDb
      .find({
         "fruits.pve.rd": { $lt: 350 }
      })
      .toArray();
   for (const player of plist) {
      console.log(player.osuname);
      console.log(
         `    ${player.fruits.pvp?.rd.toFixed(5)} => ${Math.sqrt(
            Math.pow(player.fruits.pvp?.rd, 2) + Math.pow(player.fruits.pvp?.vol, 2) * 52
         ).toFixed(5)}`
      );
      console.log(
         `    ${player.fruits.pve.rd.toFixed(5)} => ${Math.sqrt(
            Math.pow(player.fruits.pve.rd, 2) + Math.pow(player.fruits.pve.vol, 2) * 52
         ).toFixed(5)}`
      );
   }
   console.log(plist.length);
   await inflateRd();
}

async function inflateRd() {
   const modes: GameMode[] = ["osu", "fruits", "taiko", "mania"];
   const inflateResult = await playersDb.updateMany(
      {
         _id: 3208718
         // $or: modes
         //    .map(m => ({ [`${m}.pve.rd`]: { $lt: 350 } }))
         //    .concat(modes.map(m => ({ [`${m}.pvp.rd`]: { $lt: 350 } })))
      },
      [
         {
            $set: {
               ...Object.fromEntries(
                  modes.flatMap(mode => {
                     const inf = (q: "pvp" | "pve") => ({
                        $cond: [
                           { $eq: [{ $type: `$${mode}.${q}.lastPlayed` }, "date"] },
                           {
                              $min: [
                                 350,
                                 {
                                    $sqrt: {
                                       $add: [
                                          { $pow: [`$${mode}.${q}.rd`, 2] },
                                          {
                                             $multiply: [
                                                { $pow: [`$${mode}.${q}.vol`, 2] },
                                                {
                                                   $dateDiff: {
                                                      startDate: `$${mode}.${q}.lastPlayed`,
                                                      endDate: "$$NOW",
                                                      unit: "week"
                                                   }
                                                }
                                             ]
                                          }
                                       ]
                                    }
                                 }
                              ]
                           },
                           `$${mode}.${q}.rd`
                        ]
                     });
                     return [
                        [`${mode}.pve.rd`, inf("pve")],
                        [
                           `${mode}.pvp`,
                           {
                              $cond: [
                                 { $eq: [{ $type: `$${mode}.pvp` }, "object"] },
                                 {
                                    $mergeObjects: [`$${mode}.pvp`, { rd: inf("pvp") }]
                                 },
                                 "$$REMOVE"
                              ]
                           }
                        ]
                     ];
                  })
               )
            }
         }
      ]
   );
   console.log(inflateResult);
}
