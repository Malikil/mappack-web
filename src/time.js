export const convertTime = seconds =>
   `${(seconds / 60) | 0}:${(seconds % 60).toFixed(0).padStart(2, "0")}`;
