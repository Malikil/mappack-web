export const convertTime = seconds =>
   `${(seconds / 60) | 0}:${(seconds % 60).toFixed(0).padStart(2, "0")}`;

/** @param {number} s */
export const seconds = (s) => s * 1000;
/** @param {number} m */
export const minutes = (m) => seconds(60 * m);
/** @param {number} h */
export const hours = (h) => minutes(60 * h);
/** @param {number} d */
export const days = (d) => hours(24 * d);

/**
 * Returns a promise which will resolve after a certain amount of milliseconds
 * @param {number} ms
 */
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
