import { DbHistory } from "@/types/database.history";
import { DbMappack } from "@/types/database.mappack";
import { DbPlayer } from "@/types/database.player";
import { DbTeam } from "@/types/database.team";
import {
   BeatmapByMode,
   FruitsBeatmap,
   ManiaBeatmap,
   OsuBeatmap,
   TaikoBeatmap
} from "@/types/database/beatmap";
import { Collection, MongoClient, ServerApiVersion } from "mongodb";
import { GameMode } from "osu-web.js";

console.log("Create mongo connection");
const client = new MongoClient(process.env.MONGO_CONNECTION, {
   serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true
   }
});
export const db = client.db("packchallenge");
export const mappacksDb = db.collection<DbMappack>("mappacks");
export const mapsDb: { [M in GameMode]: Collection<BeatmapByMode[M]> } = {
   osu: db.collection<OsuBeatmap>("osu"),
   taiko: db.collection<TaikoBeatmap>("taiko"),
   fruits: db.collection<FruitsBeatmap>("fruits"),
   mania: db.collection<ManiaBeatmap>("mania")
};
export const playersDb = db.collection<DbPlayer>("players");
export const historyDb = db.collection<DbHistory>("history");
export const mpLinksDb = db.collection<{ _id: number }>("mpLinks");
export const teamsDb = db.collection<DbTeam>("teams");

export default db;
