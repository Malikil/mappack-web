export function* splitArray<T>(arr: Array<T>, size: number = 50) {
   for (let i = 0; i * size < arr.length; i++) {
      const section = arr.slice(i * size, (i + 1) * size);
      yield section;
   }
}
