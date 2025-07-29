import { FindCursor } from "mongodb";

export function* splitArray<T>(arr: Array<T>, size: number = 50) {
   for (let i = 0; i * size < arr.length; i++) {
      const section = arr.slice(i * size, (i + 1) * size);
      yield section;
   }
}

export async function* batchCursor<T>(cursor: FindCursor<T>, batchSize: number = 50) {
   let batch: T[] = [];
   for await (const document of cursor) {
      batch.push(document);
      if (batch.length >= batchSize) {
         yield batch;
         batch = [];
      }
   }
   if (batch.length > 0) yield batch;
}
