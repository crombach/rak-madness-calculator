export enum KickoffDay {
  TODAY = "today",
  TOMORROW = "tomorrow",
  LATER = "later",
}

/** Midnight at the start of `date`'s day, `days` on, in the reader's time zone. */
function startOfDay(date: Date, days = 0): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * Which of the reader's calendar days a kickoff falls on. A kickoff already past
 * is today, since the game is still to start.
 */
export default function kickoffDay(kickoff: Date, now: Date): KickoffDay {
  if (kickoff < startOfDay(now, 1)) return KickoffDay.TODAY;
  if (kickoff < startOfDay(now, 2)) return KickoffDay.TOMORROW;
  return KickoffDay.LATER;
}
