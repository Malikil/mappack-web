import { mapsDb } from "@/app/api/db/connection";
import { DbBeatmap } from "@/types/database.beatmap";
import { ModPool as ModPoolType } from "@/types/rating";
import PoolDisplayByMod from "../PoolDisplayByMod";

const MODLIST: ModPoolType[] = ["nm", "hd", "hr", "dt", "fm"];

export default async function LobbyPool({ searchParams }) {
   const stringParams = await searchParams;
   const parsedParams = Object.fromEntries(
      Object.keys(stringParams).map(k => [k, (stringParams[k].split(",") || []).map(v => parseInt(v))])
   ) as Partial<Record<ModPoolType, number[]>> & { l?: string };
   parsedParams.l = decodeURIComponent(stringParams.l);

   // Get all maps. If pools are rotated while the match is ongoing, the previous maps will still need
   // to be visible on the lobby's pool page
   const mapIds = MODLIST.flatMap(mod => parsedParams[mod] || []);
   const maps: DbBeatmap[] = await mapsDb[stringParams.m || "osu"].find({ _id: { $in: mapIds } }).toArray();
   const maplist: Partial<Record<ModPoolType, DbBeatmap[]>> = Object.fromEntries(
      MODLIST.map(mod =>
         parsedParams[mod]
            ? [mod, parsedParams[mod].map(m => maps.find(p => p._id === m)).filter(m => m)]
            : null
      ).filter(v => v)
   );
   console.log(maplist);

   return <PoolDisplayByMod title={parsedParams.l} maplist={maplist} />;
}
