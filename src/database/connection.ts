import { DbHistory } from "@/types/database.history";
import { DbMappack } from "@/types/database.mappack";
import { DbPlayer } from "@/types/database.player";
import { DbTeam } from "@/types/database.team";
import { BeatmapByMode } from "@/types/database/beatmap";
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
export const mapsDb: {
   [M in GameMode]: Collection<BeatmapByMode[M]>;
} = {
   osu: db.collection<BeatmapByMode["osu"]>("osu"),
   taiko: db.collection<BeatmapByMode["taiko"]>("taiko"),
   fruits: db.collection<BeatmapByMode["fruits"]>("fruits"),
   mania: db.collection<BeatmapByMode["mania"]>("mania")
};
export function getMapsCollection<M extends GameMode>(mode: M): Collection<BeatmapByMode[M]> {
   return mapsDb[mode];
}
export const playersDb = db.collection<DbPlayer>("players");
export const historyDb = db.collection<DbHistory>("history");
export const mpLinksDb = db.collection<{ _id: number }>("mpLinks");
export const teamsDb = db.collection<DbTeam>("teams");

export default db;
