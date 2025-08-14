import { CatchBeatmap, DbBeatmap, ManiaBeatmap, ModeCollectionMap } from "@/types/database.beatmap";
import { DbHistory } from "@/types/database.history";
import { DbMappack } from "@/types/database.mappack";
import { DbPlayer } from "@/types/database.player";
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
//export const mapsDb = db.collection<DbBeatmap>("maps");
export const osuDb = db.collection<DbBeatmap>("std");
export const taikoDb = db.collection<DbBeatmap>("taiko");
export const fruitsDb = db.collection<CatchBeatmap>("fruits");
export const maniaDb = db.collection<ManiaBeatmap>("mania");
export const mapsDb: { [M in GameMode]: Collection<ModeCollectionMap[M]> } = {
   osu: osuDb,
   taiko: taikoDb,
   fruits: fruitsDb,
   mania: maniaDb
} as const;
export const playersDb = db.collection<DbPlayer>("players");
export const historyDb = db.collection<DbHistory>("history");

export default db;
