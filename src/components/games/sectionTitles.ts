import { KickoffDay } from "./kickoffDay";

// Apart from `Games`, so the skeleton never pulls in the page's chunk.
export const LIVE_TITLE = "Live";
/** Each day's section, in page order. */
export const DAYS: ReadonlyArray<{ day: KickoffDay; title: string }> = [
  { day: KickoffDay.TODAY, title: "Today" },
  { day: KickoffDay.TOMORROW, title: "Tomorrow" },
  { day: KickoffDay.LATER, title: "Upcoming" },
];
export const COMPLETED_TITLE = "Completed";
