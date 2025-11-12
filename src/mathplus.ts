export function stdev(...values: number[]) {
   const avg = values.reduce((s, n) => s + n);
   const mean = avg / values.length;
   const variance = values.reduce((sum, n) => sum + (n - mean) * (n - mean), 0);
   return Math.sqrt(variance / (values.length - 1));
}

export default {
   stdev
};
