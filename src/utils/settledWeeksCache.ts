// Whether a week was settled when this browser last scored it, so a settled week's
// results can open without the refresh controls before its scores arrive. The
// scores replace this guess as soon as they load.

import localStorageCache from "./localStorageCache";

/** A flag per week, a few bytes each. */
const MAX_CACHED_WEEKS = 32;

const settledWeeks = localStorageCache<boolean>({
  prefix: "rak-madness:settled:",
  cap: MAX_CACHED_WEEKS,
  label: "settled weeks",
  encode: (value) => JSON.stringify(value),
  decode: (text) => JSON.parse(text) === true,
});

export function readSettledWeek(season: number, weekNumber: number): boolean {
  return settledWeeks.read(`${season}:${weekNumber}`) ?? false;
}

/** Skips the write when the stored flag already matches. */
export function writeSettledWeek(
  season: number,
  weekNumber: number,
  isSettled: boolean,
): void {
  if (readSettledWeek(season, weekNumber) === isSettled) return;
  settledWeeks.write(`${season}:${weekNumber}`, isSettled);
}
