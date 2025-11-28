import { DbBeatmap } from "@/types/database.beatmap";
import { GameMode, Mod } from "osu-web.js";
import { addPool, savePool } from "../profile/[playerid]/pools/actions";
import { parseShortMods } from "@/helpers/mods";
import { revalidatePath } from "next/cache";

export async function saveToOwnPools(osuid: number, maps: { [pool: string]: DbBeatmap[] },
   mode: GameMode, name: string) {
      const maplist: { map: DbBeatmap, mods: Mod[] }[] = Object.keys(maps).flatMap(modStr => {
         const mods = parseShortMods(modStr);
         return maps[modStr].map(map => ({ map, mods }))
      })
   await addPool(osuid, mode);
   await savePool(osuid, mode, '', name, maplist);

   revalidatePath('/maps');
}