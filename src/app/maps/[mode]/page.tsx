import { mapsDb } from "@/app/api/db/connection";
import { redirect } from "next/navigation";
import { GameMode } from "osu-web.js";

export default async function MapPage({ params, searchParams }) {
   const stringParams = await params;
   const mode = stringParams.mode as GameMode;
   const mapOverride = parseInt((await searchParams).id);
   if (!mapOverride || !["osu", "fruits", "taiko", "mania"].includes(mode)) return redirect("/");

   const map = await mapsDb[mode].findOne({ _id: mapOverride });
   if (map) redirect(`/maps/${mode}/${map.setid}`);
   else redirect('/');
}