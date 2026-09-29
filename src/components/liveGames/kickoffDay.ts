import { calendarDaysUntil } from "../gameStatus/gameStatusText";

export enum KickoffDay {
  TODAY = "today",
  TOMORROW = "tomorrow",
  LATER = "later",
}

/**
 * Which of the reader's calendar days a kickoff falls on. A kickoff already past
 * is today, since the game is still to start.
 */
export default function kickoffDay(kickoff: Date, now: Date): KickoffDay {
  const days = calendarDaysUntil(kickoff, now);
  if (days <= 0) return KickoffDay.TODAY;
  if (days === 1) return KickoffDay.TOMORROW;
  return KickoffDay.LATER;
}
