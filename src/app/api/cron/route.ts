import { createMappool, cyclePools } from "@/helpers/addPool";
import { NextRequest, NextResponse } from "next/server";
import { Client, GameMode } from "osu-web.js";
import { historyDb, playersDb } from "../db/connection";
import {
   UndocumentedBeatmappack,
   UndocumentedBeatmappackCompact,
   UndocumentedBeatmappackResponse
} from "@/types/undocumented.beatmappacks";
import { DbHistory } from "@/types/database.history";

async function getOsuToken() {
   console.log("Get osu token");
   const url = new URL("https://osu.ppy.sh/oauth/token");
   const headers = {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
   };
   const body = `client_id=${process.env.AUTH_OSU_ID}&client_secret=${process.env.AUTH_OSU_SECRET}&grant_type=client_credentials&scope=public`;
   const osuResponse = await fetch(url, {
      method: "POST",
      headers,
      body
      // cache: "no-store" // TODO Investigate if this will be needed in production
   }).then(res => res.json());
   return osuResponse.access_token;
}

async function findMappackTag(packList: UndocumentedBeatmappackCompact[], mode: GameMode) {
   const history = (await historyDb.findOne({ _id: `${mode}Packs` })) as DbHistory & { type: "string" };
   const modeMapping = {
      osu: null,
      taiko: 1,
      fruits: 2,
      mania: 3
   };
   // Find the latest pack first
   const pack = packList.find(p => p.ruleset_id == modeMapping[mode]);
   if (history.items.includes(pack.name)) {
      // Find the highest number that's not on history
      const numberIndex = pack.name.lastIndexOf("#");
      let i = parseInt(pack.name.slice(numberIndex + 1)) - 1;
      while (history.items.includes(`${pack.name.slice(0, numberIndex)}#${i}`)) i--;
      // Construct the appropriate tag
      const modeTag = {
         osu: "",
         taiko: "T",
         fruits: "C",
         mania: "M"
      };
      return `S${modeTag[mode]}${i}`;
   } else return pack.tag;
}

// Increase this function's max duration to 45s
// Max duration configurable is 60s without enabling fluid compute
export const maxDuration = 45;
export async function GET(req: NextRequest) {
   if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`)
      return new NextResponse("Unauthorized", { status: 401 });

   try {
      // Get recent beatmap packs
      const accessToken = await getOsuToken();
      const client = new Client(accessToken);
      const packs = await client.getUndocumented<UndocumentedBeatmappackResponse>("beatmaps/packs");
      console.log(packs.beatmap_packs.slice(0, 3), `+ ${packs.beatmap_packs.length - 3} more`);
      // Give up with std converts. Just always fetch a ctb pool.
      const modesToFetch: GameMode[] = ["osu", "taiko", "fruits", "mania"];

      await modesToFetch.reduce(
         (wait, mode) =>
            wait.then(async () => {
               const mappackTag = await findMappackTag(packs.beatmap_packs, mode);
               console.log(`Found mappack ${mappackTag}`);
               const mappack = await client.getUndocumented<UndocumentedBeatmappack>(
                  `beatmaps/packs/${mappackTag}`
               );
               console.log(`Add mappack ${mappack.tag}`);
               await createMappool(
                  accessToken,
                  mappack.name,
                  mappack.url,
                  mappack.beatmapsets.map(bms => bms.id),
                  mode
               );
            }),
         Promise.resolve()
      );

      await cyclePools();
      await inflateRd();
      return new NextResponse("OK");
   } catch (err) {
      console.error(err);
      return new NextResponse("Error", { status: 500 });
   }
}

async function inflateRd() {
   const modes: GameMode[] = ["osu", "fruits", "taiko", "mania"];
   const inflateResult = await playersDb.updateMany(
      {
         $or: modes
            .map(m => ({ [`${m}.pve.rd`]: { $lt: 350 } }))
            .concat(modes.map(m => ({ [`${m}.pvp.rd`]: { $lt: 350 } })))
      },
      [
         {
            $set: {
               ...Object.fromEntries(
                  modes.flatMap(mode => {
                     const build = (q: "pve" | "pvp") => [
                        `${mode}.${q}.rd`,
                        {
                           $cond: [
                              {
                                 $and: [
                                    { $eq: [{ $type: `$${mode}.${q}` }, "object"] },
                                    { $ne: [`$${mode}.${q}.lastPlayed`, null] }
                                 ]
                              },
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
                        }
                     ];
                     return [build("pve"), build("pvp")];
                  })
               )
            }
         }
      ]
   );
   console.log(inflateResult);
}