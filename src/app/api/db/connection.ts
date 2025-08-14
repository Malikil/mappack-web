import { DbBeatmap, ManiaBeatmap } from "@/types/database.beatmap";
import { DbHistory } from "@/types/database.history";
import { DbMappack } from "@/types/database.mappack";
import { DbPlayer } from "@/types/database.player";
import { MongoClient, ServerApiVersion } from "mongodb";

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
export const mapsDb = db.collection<DbBeatmap>("maps");
export const maniaDb = db.collection<ManiaBeatmap>("mania");
export const playersDb = db.collection<DbPlayer>("players");
export const historyDb = db.collection<DbHistory>("history");

export default db;
