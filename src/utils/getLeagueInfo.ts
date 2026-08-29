import { League, LeagueInfo, SeasonType } from "../types/League";
import { readCachedCalendar, writeCachedCalendar } from "./espnCache";

type WeekEntry = {
  label: string;
  alternateLabel: string;
  detail: string;
  value: string;
  startDate: string;
  endDate: string;
};

type Calendar = {
  value: string;
  startDate: string;
  endDate: string;
  /** Absent on calendars that have no weeks, which is how ESPN sends Off Season. */
  entries?: WeekEntry[];
};

type LeagueMetadata = {
  slug: string;
  season: { year: number };
  calendar: Calendar[];
};

type Scoreboard = {
  leagues: LeagueMetadata[];
};

/**
 * How many weeks a season's regular season has, or undefined if the calendar for
 * it could not be read.
 *
 * The count is not the same every year: the NCAA regular season ran 15 weeks in
 * 2023 and 16 in 2024, and it decides where the regular season ends and the
 * postseason begins. Cached per league and season, because it is fixed once the
 * calendar is published and scoring asks for it on every refresh.
 */
export async function getRegularSeasonWeekCount(
  league: League,
  season?: number,
): Promise<number | undefined> {
  // A season left unspecified means "whichever one is current", which changes
  // over time, so there is nothing to key a cache lookup on until the response
  // names the season it actually described.
  if (season != null) {
    const cached = regularSeasonWeekCounts.get(`${league}:${season}`);
    if (cached != null) {
      return cached;
    }
  }
  const info = await getLeagueInfo(league, season);
  const regularSeason = info?.calendars.find(
    (calendar) => calendar.seasonType === SeasonType.REGULAR,
  );
  const count = regularSeason?.weeks.length;
  if (info == null || count == null || count === 0) {
    return undefined;
  }
  regularSeasonWeekCounts.set(`${league}:${info.season}`, count);
  return count;
}

const regularSeasonWeekCounts = new Map<string, number>();

/**
 * Fetches league information from the ESPN API.
 *
 * ESPN's `dates` param takes `season`. `dates=2025` covers the games played from
 * September 2025 into January 2026, not the 2026 games of the season after. Left
 * out, ESPN answers with whichever season is running now.
 */
export default function getLeagueInfo(
  league: League,
  season?: number,
): Promise<LeagueInfo | null> {
  // A request for whichever season is running is keyed apart from one for a named
  // season, so each answers once and then drops.
  const key = `${league}:${season ?? "current"}`;
  const inFlight = requests.get(key);
  if (inFlight != null) {
    return inFlight;
  }
  const request = fetchLeagueInfo(league, season).finally(() =>
    requests.delete(key),
  );
  requests.set(key, request);
  return request;
}

const requests = new Map<string, Promise<LeagueInfo | null>>();

async function fetchLeagueInfo(
  league: League,
  season?: number,
): Promise<LeagueInfo | null> {
  // A season this browser has already seen the end of. Its schedule cannot gain
  // another week, so it is read rather than asked for.
  if (season != null) {
    const held = readCachedCalendar<Scoreboard>(league, season);
    const info = held != null ? toLeagueInfo(league, held) : null;
    if (info != null) {
      return info;
    }
  }

  const response = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/${league}/scoreboard${
      season != null ? `?dates=${season}` : ""
    }`,
  );
  if (!response.ok) {
    console.error(
      `Error fetching league info from scoreboard endpoint for league ${league}`,
      response.status,
    );
    return null;
  }
  const scoreboard: Scoreboard = await response.json();
  const info = toLeagueInfo(league, scoreboard);
  if (info != null && season != null && isSeasonOver(info)) {
    // Only the calendar, not the whole answer, which carries a week of games with it.
    writeCachedCalendar(league, season, {
      leagues: scoreboard.leagues.filter(
        (it) => it.slug === (league as string),
      ),
    });
  }
  return info;
}

/**
 * Whether every week a season has is behind us.
 *
 * Read from the calendars that have weeks, because ESPN's Off Season calendar runs to
 * the following August and would have a season looking unfinished for half a year
 * after its last game.
 */
function isSeasonOver(info: LeagueInfo): boolean {
  const now = new Date();
  const dated = info.calendars.filter((calendar) => calendar.weeks.length > 0);
  return (
    dated.length > 0 &&
    dated.every((calendar) => calendar.endDate.valueOf() < now.valueOf())
  );
}

function toLeagueInfo(
  league: League,
  scoreboard: Scoreboard,
): LeagueInfo | null {
  const leagueMetadata = scoreboard.leagues.find(
    (it) => it.slug === (league as string),
  );
  if (leagueMetadata == null) {
    console.error(`Scoreboard response has no calendar for league ${league}`);
    return null;
  }

  const now = new Date();

  const calendars = leagueMetadata.calendar.map((cal) => {
    return {
      seasonType: parseInt(cal.value) as SeasonType,
      startDate: new Date(cal.startDate),
      endDate: new Date(cal.endDate),
      weeks: (cal.entries ?? []).map((week) => {
        return {
          value: parseInt(week.value),
          label: week.label,
          startDate: new Date(week.startDate),
          endDate: new Date(week.endDate),
        };
      }),
    };
  });

  // A calendar with no weeks can never yield an active week, and ESPN ships one
  // every year: Off Season. Leave it out of the running.
  const datedCalendars = calendars.filter((cal) => cal.weeks.length > 0);

  // For the NFL, we always want to use the regular season calendar.
  // For the NCAA, we go by date because we cross into the postseason.
  // Fall back to the last calendar.
  const activeCalendar =
    league === League.PRO
      ? datedCalendars.find((cal) => cal.seasonType === SeasonType.REGULAR)
      : datedCalendars.find((cal, index) => {
          return (
            (cal.startDate <= now && cal.endDate >= now) ||
            index === datedCalendars.length - 1
          );
        });

  if (activeCalendar == null) {
    console.error(
      `Scoreboard response has no dated calendar for league ${league}`,
    );
    return null;
  }

  // The week being played now, or the last one begun once the season is over. A
  // season whose opener is still ahead has none. `findLast` would say this in one
  // call, but it is ES2023 and this builds to ES2022.
  const activeWeek = activeCalendar.weeks
    .filter((week) => week.startDate <= now)
    .at(-1);

  return {
    league,
    season: leagueMetadata.season.year,
    activeCalendar,
    activeWeek,
    calendars,
  };
}
