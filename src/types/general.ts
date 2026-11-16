export type UnionKeys<T> = T extends unknown ? keyof T : never;
export type UnionValue<T, K extends PropertyKey> =
   T extends unknown
      ? K extends keyof T
         ? T[K]
         : never
      : never;
export type MergeUnion<T> = {
   [K in UnionKeys<T>]?: UnionValue<T, K>;
};
