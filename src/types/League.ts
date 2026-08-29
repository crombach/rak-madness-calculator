export enum League {
  PRO = "nfl",
  COLLEGE = "college-football",
}

export enum SeasonType {
  REGULAR = 2,
  POST = 3,
  OFF = 4,
}

/**
 * One week of a league's season, chosen from its calendar.
 *
 * A `WeekInfo` value is named `week`. Its number alone is `weekNumber`. A week
 * named by a URL segment, before it is looked up, is `weekParam`.
 *
 * A season is named by the year it started in, and that value is `season`. A
 * season named by a URL segment is `seasonParam`. Qualify only where a requested
 * season and the one already loaded are both on hand at once: `requestedSeason`
 * and `loadedSeason`.
 */
export type WeekInfo = {
  value: number;
  label: string;
  startDate: Date;
  endDate: Date;
};

export type LeagueCalendar = {
  seasonType: SeasonType;
  startDate: Date;
  endDate: Date;
  weeks: Array<{
    value: number;
    label: string;
    startDate: Date;
    endDate: Date;
  }>;
};

export type LeagueInfo = {
  league: League;
  /**
   * The year the season started in. A season runs into the following January, so
   * every week of the 2025 season is a 2025 week, including the ones played in
   * January 2026.
   */
  season: number;
  activeCalendar: LeagueCalendar;
  /**
   * The week being played now, or the last one that has begun. Absent where the
   * season's opener is still ahead, which means no week of it can be scored yet.
   */
  activeWeek?: WeekInfo;
  calendars: LeagueCalendar[];
};
