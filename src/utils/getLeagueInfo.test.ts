import { Mock } from "vitest";
import { League, SeasonType } from "../types/League";
import { SEASON } from "../weekFixtures";
import getLeagueInfo, { getRegularSeasonWeekCount } from "./getLeagueInfo";

const NOW = new Date("2024-10-06T12:00:00Z");

function week(value: string, startDate: string, endDate: string) {
  return {
    label: `Week ${value}`,
    alternateLabel: `Wk ${value}`,
    detail: "",
    value,
    startDate,
    endDate,
  };
}

const REGULAR_SEASON = {
  value: String(SeasonType.REGULAR),
  startDate: "2024-09-01T00:00Z",
  endDate: "2024-12-31T00:00Z",
  entries: [
    week("1", "2024-09-01T00:00Z", "2024-09-08T00:00Z"),
    week("5", "2024-10-01T00:00Z", "2024-10-08T00:00Z"),
    week("18", "2024-12-24T00:00Z", "2024-12-31T00:00Z"),
  ],
};

const POST_SEASON = {
  value: String(SeasonType.POST),
  startDate: "2025-01-01T00:00Z",
  endDate: "2025-02-15T00:00Z",
  entries: [week("1", "2025-01-01T00:00Z", "2025-01-08T00:00Z")],
};

// ESPN sends the off-season calendar with no `entries` key at all.
const OFF_SEASON = {
  value: String(SeasonType.OFF),
  startDate: "2025-02-16T00:00Z",
  endDate: "2025-08-01T00:00Z",
};

type CalendarFixture = {
  value: string;
  startDate: string;
  endDate: string;
  entries?: Array<ReturnType<typeof week>>;
};

function scoreboard(
  slug: string,
  calendar: Array<CalendarFixture> = [REGULAR_SEASON, POST_SEASON],
) {
  return { leagues: [{ slug, season: { year: SEASON }, calendar }] };
}

function scoreboardForSeason(
  slug: string,
  seasonYear: number,
  calendar: Array<CalendarFixture> = [REGULAR_SEASON],
) {
  return { leagues: [{ slug, season: { year: seasonYear }, calendar }] };
}

/** A season every week of which is behind `NOW`. */
const FINISHED_SEASON = {
  value: String(SeasonType.REGULAR),
  startDate: "2022-09-01T00:00Z",
  endDate: "2023-01-01T00:00Z",
  entries: [week("1", "2022-09-01T00:00Z", "2022-09-08T00:00Z")],
};

// ESPN's Off Season calendar runs to the following August, and has no weeks.
const FINISHED_OFF_SEASON = {
  value: String(SeasonType.OFF),
  startDate: "2023-01-02T00:00Z",
  endDate: "2025-08-01T00:00Z",
};

function mockFetch(body: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function urlOf(fetchMock: Mock): string {
  return fetchMock.mock.calls[0][0];
}

/** getLeagueInfo returns null on a bad response, which these cases never mock. */
async function infoFor(league: League) {
  const info = await getLeagueInfo(league);
  if (info == null) {
    throw new Error(`getLeagueInfo unexpectedly returned null for ${league}`);
  }
  return info;
}

beforeEach(() => {
  // jsdom keeps storage between cases, and a finished season's calendar is held there.
  localStorage.clear();
  vi.useFakeTimers().setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getLeagueInfo, requests", () => {
  it("fetches the pro scoreboard endpoint", async () => {
    const fetchMock = mockFetch(scoreboard(League.PRO));
    await getLeagueInfo(League.PRO);
    expect(urlOf(fetchMock)).toBe(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
    );
  });

  it("asks for a past season by the year it started in", async () => {
    const fetchMock = mockFetch(scoreboard(League.PRO));
    await getLeagueInfo(League.PRO, 2022);
    expect(urlOf(fetchMock)).toBe(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2022",
    );
  });

  it("reports the season the response describes", async () => {
    mockFetch(scoreboard(League.PRO));
    expect((await infoFor(League.PRO)).season).toBe(SEASON);
  });

  it("fetches the college scoreboard endpoint", async () => {
    const fetchMock = mockFetch(scoreboard(League.COLLEGE));
    await getLeagueInfo(League.COLLEGE);
    expect(urlOf(fetchMock)).toBe(
      "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard",
    );
  });

  it("returns null when the request fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockFetch({}, false, 503);
    expect(await getLeagueInfo(League.PRO)).toBeNull();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("getLeagueInfo, calendar mapping", () => {
  it("parses season types, dates, and week numbers", async () => {
    mockFetch(scoreboard(League.PRO));
    const info = await infoFor(League.PRO);
    expect(info.league).toBe(League.PRO);
    expect(info.calendars.map((cal) => cal.seasonType)).toEqual([
      SeasonType.REGULAR,
      SeasonType.POST,
    ]);
    expect(info.calendars[0].startDate).toEqual(new Date("2024-09-01T00:00Z"));
    expect(info.calendars[0].weeks.map((it) => it.value)).toEqual([1, 5, 18]);
    expect(info.calendars[0].weeks[1].label).toBe("Week 5");
  });

  it("uses the regular season calendar for the pro league", async () => {
    mockFetch(scoreboard(League.PRO));
    const info = await infoFor(League.PRO);
    expect(info.activeCalendar.seasonType).toBe(SeasonType.REGULAR);
  });

  it("uses the calendar covering today for the college league", async () => {
    mockFetch(scoreboard(League.COLLEGE));
    const info = await infoFor(League.COLLEGE);
    expect(info.activeCalendar.seasonType).toBe(SeasonType.REGULAR);
  });

  it("survives a calendar that has no entries key", async () => {
    mockFetch(
      scoreboard(League.PRO, [REGULAR_SEASON, POST_SEASON, OFF_SEASON]),
    );
    const info = await infoFor(League.PRO);
    expect(info.calendars.map((cal) => cal.seasonType)).toEqual([
      SeasonType.REGULAR,
      SeasonType.POST,
      SeasonType.OFF,
    ]);
    expect(info.calendars[2].weeks).toEqual([]);
    expect(info.activeCalendar.seasonType).toBe(SeasonType.REGULAR);
  });

  it("never treats a calendar with no weeks as the active one", async () => {
    mockFetch(scoreboard(League.COLLEGE, [REGULAR_SEASON, OFF_SEASON]));
    vi.setSystemTime(new Date("2025-05-01T00:00Z"));
    const info = await infoFor(League.COLLEGE);
    expect(info.activeCalendar.seasonType).toBe(SeasonType.REGULAR);
    expect(info.activeWeek?.value).toBe(18);
  });

  it("falls back to the last college calendar outside every date range", async () => {
    vi.setSystemTime(new Date("2025-08-01T00:00Z"));
    mockFetch(scoreboard(League.COLLEGE));
    const info = await infoFor(League.COLLEGE);
    expect(info.activeCalendar.seasonType).toBe(SeasonType.POST);
  });
});

describe("getLeagueInfo, active week", () => {
  it("picks the week containing today", async () => {
    mockFetch(scoreboard(League.PRO));
    const info = await infoFor(League.PRO);
    expect(info.activeWeek?.value).toBe(5);
  });

  it("holds the last week that has begun between two weeks", async () => {
    vi.setSystemTime(new Date("2024-11-15T00:00Z"));
    mockFetch(scoreboard(League.PRO));
    const info = await infoFor(League.PRO);
    expect(info.activeWeek?.value).toBe(5);
  });

  it("holds the last week of the season once it is over", async () => {
    vi.setSystemTime(new Date("2025-06-01T00:00Z"));
    mockFetch(scoreboard(League.PRO));
    const info = await infoFor(League.PRO);
    expect(info.activeWeek?.value).toBe(18);
  });

  it("has no active week before the season's opener", async () => {
    vi.setSystemTime(new Date("2024-08-01T00:00Z"));
    mockFetch(scoreboard(League.PRO));
    const info = await infoFor(League.PRO);
    expect(info.activeWeek).toBeUndefined();
  });
});

describe("getRegularSeasonWeekCount, caching", () => {
  it("refetches every time when no season is given, since the current season changes over time", async () => {
    const fetchMock = mockFetch(scoreboardForSeason(League.PRO, 3001));
    await getRegularSeasonWeekCount(League.PRO);
    await getRegularSeasonWeekCount(League.PRO);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("caches a week count fetched with an explicit season", async () => {
    const fetchMock = mockFetch(scoreboardForSeason(League.PRO, 3002));
    await getRegularSeasonWeekCount(League.PRO, 3002);
    await getRegularSeasonWeekCount(League.PRO, 3002);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keys the cache on the season the response reports, not the request", async () => {
    const fetchMock = mockFetch(scoreboardForSeason(League.COLLEGE, 3003));
    await getRegularSeasonWeekCount(League.COLLEGE);
    await getRegularSeasonWeekCount(League.COLLEGE, 3003);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("getLeagueInfo, what it holds on to", () => {
  it("reads a finished season's calendar back rather than asking again", async () => {
    const fetchMock = mockFetch(
      scoreboardForSeason(League.PRO, 3101, [
        FINISHED_SEASON,
        FINISHED_OFF_SEASON,
      ]),
    );
    const first = await getLeagueInfo(League.PRO, 3101);

    const again = await getLeagueInfo(League.PRO, 3101);

    // The Off Season calendar has yet to end, and is not what says whether a season is
    // over: it has no weeks, and every week there is has been played.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(again?.season).toBe(3101);
    expect(again?.activeCalendar.weeks).toEqual(first?.activeCalendar.weeks);
    expect(again?.activeWeek?.startDate).toBeInstanceOf(Date);
  });

  it("asks again for a season that is not over", async () => {
    const fetchMock = mockFetch(scoreboardForSeason(League.PRO, 3102));

    await getLeagueInfo(League.PRO, 3102);
    await getLeagueInfo(League.PRO, 3102);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("holds nothing where no season was named, that being whichever runs now", async () => {
    const fetchMock = mockFetch(
      scoreboardForSeason(League.PRO, 3103, [
        FINISHED_SEASON,
        FINISHED_OFF_SEASON,
      ]),
    );

    await getLeagueInfo(League.PRO);
    await getLeagueInfo(League.PRO);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
