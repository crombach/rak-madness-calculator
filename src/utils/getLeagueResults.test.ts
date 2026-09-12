import { Mock, MockedFunction } from "vitest";
import {
  ESPN_STATE,
  EspnCompetitor,
  EspnEvent,
  GameStatus,
  HomeAway,
} from "../types/ESPN";
import { League, WeekInfo } from "../types/League";
import { getGameResult, getLeagueResults } from "./getLeagueResults";

vi.mock("./getLeagueInfo");

import { getRegularSeasonWeekCount } from "./getLeagueInfo";

const weekCountMock = getRegularSeasonWeekCount as MockedFunction<
  typeof getRegularSeasonWeekCount
>;

const WEEK: WeekInfo = {
  value: 5,
  label: "Week 5",
  startDate: new Date("2024-10-01T00:00:00Z"),
  endDate: new Date("2024-10-08T00:00:00Z"),
};

const GAME_DATE = "2024-10-06T17:00Z";

function competitor(
  abbreviation: string,
  homeAway: HomeAway,
  score: number,
  extras: Partial<EspnCompetitor> = {},
) {
  return {
    id: abbreviation,
    homeAway,
    winner: false,
    team: {
      displayName: `${abbreviation} Team`,
      shortDisplayName: abbreviation,
      abbreviation,
    },
    score: String(score),
    ...extras,
  };
}

function espnEvent({
  home,
  away,
  homeScore = 30,
  awayScore = 20,
  status = GameStatus.FINAL,
  date = GAME_DATE,
  situation,
  id = "1",
  homeExtras,
  awayExtras,
  venue,
}: {
  home: string;
  away: string;
  homeScore?: number;
  awayScore?: number;
  status?: GameStatus;
  date?: string;
  situation?: { downDistanceText?: string; possession: string };
  id?: string;
  homeExtras?: Partial<EspnCompetitor>;
  awayExtras?: Partial<EspnCompetitor>;
  venue?: EspnEvent["competitions"][0]["venue"];
}): EspnEvent {
  return {
    id,
    name: `${away} Team at ${home} Team`,
    shortName: `${away} @ ${home}`,
    date,
    status: {
      type: {
        id: status,
        state: ESPN_STATE[status],
        shortDetail: status === GameStatus.FINAL ? "Final" : "3rd Quarter",
      },
    },
    competitions: [
      {
        competitors: [
          competitor(home, HomeAway.HOME, homeScore, homeExtras),
          competitor(away, HomeAway.AWAY, awayScore, awayExtras),
        ],
        situation: situation as never,
        date,
        venue,
      },
    ],
  };
}

/** Every fetch resolves to the same event list. */
function mockFetch(events: Array<EspnEvent>) {
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ events }) });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function urlsOf(fetchMock: Mock): Array<string> {
  return fetchMock.mock.calls.map((call) => call[0]);
}

const bufVsKc = espnEvent({ home: "BUF", away: "KC" });
const BUF_KC = new Set(["BUF", "KC"]);

beforeEach(() => {
  // jsdom keeps storage between cases, and a week whose games are over is held there,
  // so a later case would find an answer an earlier one left behind.
  localStorage.clear();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  // The counts the calendars carried in 2024.
  weekCountMock.mockImplementation(async (league) =>
    league === League.COLLEGE ? 16 : 18,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getLeagueResults, pro requests", () => {
  it("requests the regular season week as given", async () => {
    const fetchMock = mockFetch([bufVsKc]);
    await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(urlsOf(fetchMock)).toEqual([
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=5&seasontype=2",
    ]);
  });

  it("asks for a past season by the year it started in", async () => {
    const fetchMock = mockFetch([bufVsKc]);
    await getLeagueResults(League.PRO, WEEK, [BUF_KC], 2022);
    expect(urlsOf(fetchMock)).toEqual([
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=5&seasontype=2&dates=2022",
    ]);
  });

  it("wraps a postseason week back to a postseason week number", async () => {
    const fetchMock = mockFetch([bufVsKc]);
    await getLeagueResults(League.PRO, { ...WEEK, value: 20 }, [BUF_KC]);
    expect(urlsOf(fetchMock)[0]).toContain("week=2&seasontype=3");
  });
});

describe("getLeagueResults, college requests", () => {
  it("shifts the week forward by one and asks for both groups", async () => {
    const fetchMock = mockFetch([espnEvent({ home: "OSU", away: "MICH" })]);
    await getLeagueResults(League.COLLEGE, WEEK, [new Set(["OSU", "MICH"])]);
    expect(urlsOf(fetchMock)).toEqual([
      "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?week=6&seasontype=2&limit=400&groups=80",
      "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?week=6&seasontype=2&limit=400&groups=22",
    ]);
  });

  it("takes the regular season's length from that season's calendar", async () => {
    // 2023 ran 15 college weeks, so Rak week 15 is college week 16, a bowl week.
    weekCountMock.mockImplementation(async (league) =>
      league === League.COLLEGE ? 15 : 18,
    );
    const fetchMock = mockFetch([espnEvent({ home: "OSU", away: "MICH" })]);

    await getLeagueResults(League.COLLEGE, { ...WEEK, value: 15 }, [
      new Set(["OSU", "MICH"]),
    ]);

    expect(urlsOf(fetchMock)[0]).toContain("week=1&seasontype=3");
  });

  it("collapses the whole postseason into week 1", async () => {
    const fetchMock = mockFetch([espnEvent({ home: "OSU", away: "MICH" })]);
    await getLeagueResults(League.COLLEGE, { ...WEEK, value: 16 }, [
      new Set(["OSU", "MICH"]),
    ]);
    expect(urlsOf(fetchMock)[0]).toContain("week=1&seasontype=3");
  });

  it("drops events that kicked off before the week started", async () => {
    mockFetch([
      espnEvent({ home: "OSU", away: "MICH", date: "2024-09-20T17:00Z" }),
      espnEvent({ home: "PSU", away: "IOWA" }),
    ]);
    const results = await getLeagueResults(League.COLLEGE, WEEK, [
      new Set(["OSU", "MICH"]),
      new Set(["PSU", "IOWA"]),
    ]);
    expect(results.map((it) => it.shortName)).toEqual([
      "IOWA @ PSU",
      "IOWA @ PSU",
    ]);
  });

  it("returns the latest game first, which is the one a bowl week is about", async () => {
    mockFetch([
      espnEvent({ home: "OSU", away: "MICH", date: "2024-10-02T17:00Z" }),
      espnEvent({ home: "PSU", away: "IOWA", date: "2024-10-05T17:00Z" }),
    ]);
    const results = await getLeagueResults(League.COLLEGE, WEEK, [
      new Set(["OSU", "MICH"]),
      new Set(["PSU", "IOWA"]),
    ]);
    expect(results.map((it) => it.shortName)[0]).toBe("IOWA @ PSU");
  });
});

describe("getLeagueResults, mapping", () => {
  it("maps an event onto a league result", async () => {
    mockFetch([bufVsKc]);
    const [result] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(result).toMatchObject({
      name: "KC Team at BUF Team",
      shortName: "KC @ BUF",
      date: new Date(GAME_DATE),
      status: GameStatus.FINAL,
      detailMessage: "Final",
      home: { team: { name: "BUF Team", abbreviation: "BUF" }, score: 30 },
      away: { team: { name: "KC Team", abbreviation: "KC" }, score: 20 },
      totalScore: 50,
    });
  });

  it("uppercases team abbreviations", async () => {
    mockFetch([espnEvent({ home: "buf", away: "kc" })]);
    const [result] = await getLeagueResults(League.PRO, WEEK, [
      new Set(["buf", "kc"]),
    ]);
    expect(result.home.team.abbreviation).toBe("BUF");
    expect(result.away.team.abbreviation).toBe("KC");
  });

  it("records the winner, the loser, and the margin", async () => {
    mockFetch([bufVsKc]);
    const [result] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(result.winner.team?.abbreviation).toBe("BUF");
    expect(result.winner.homeAway).toBe(HomeAway.HOME);
    expect(result.loser.team?.abbreviation).toBe("KC");
    expect(result.winner.by).toBe(10);
  });

  it("leaves the winner unset for a tie", async () => {
    mockFetch([espnEvent({ home: "BUF", away: "KC", awayScore: 30 })]);
    const [result] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(result.winner.team).toBeNull();
    expect(result.loser.team).toBeNull();
  });

  it("leaves the winner unset while the game is live", async () => {
    mockFetch([
      espnEvent({ home: "BUF", away: "KC", status: GameStatus.LIVE }),
    ]);
    const [result] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(result.status).toBe(GameStatus.LIVE);
    expect(result.winner.team).toBeNull();
    expect(result.detailMessage).toBe("3rd Quarter");
  });

  it("counts a game at halftime as live, which ESPN gives an id of its own", async () => {
    const halftime = espnEvent({ home: "BUF", away: "KC" });
    // One of several ids ESPN has for a game underway beyond plain `2`. The app
    // models none of them, so the cast is the fixture saying what the wire says.
    halftime.status.type = {
      id: "23" as GameStatus,
      state: "in",
      shortDetail: "Halftime",
    };
    mockFetch([halftime]);
    const [result] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(result.status).toBe(GameStatus.LIVE);
    expect(result.winner.team).toBeNull();
  });

  it("leaves a postponed game outside all three, since ESPN calls it over", async () => {
    const postponed = espnEvent({ home: "BUF", away: "KC" });
    postponed.status.type = {
      id: "6" as GameStatus,
      state: "post",
      shortDetail: "Postponed",
    };
    mockFetch([postponed]);
    const [result] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(result.status).not.toBe(GameStatus.FINAL);
    expect(result.status).not.toBe(GameStatus.LIVE);
  });

  it("reports an unsigned margin for a live game, even one the home team leads", async () => {
    mockFetch([
      espnEvent({
        home: "BUF",
        away: "KC",
        homeScore: 30,
        awayScore: 20,
        status: GameStatus.LIVE,
      }),
    ]);
    const [result] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(result.winner.by).toBe(10);
    expect(result.loser.by).toBe(10);
  });

  it("reads down and distance and which side has the ball", async () => {
    mockFetch([
      espnEvent({
        home: "BUF",
        away: "KC",
        status: GameStatus.LIVE,
        situation: { downDistanceText: "2nd & 7", possession: "KC" },
      }),
    ]);
    const [result] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(result.possession).toEqual({
      downDistanceText: "2nd & 7",
      homeAway: HomeAway.AWAY,
    });
  });

  it("carries the event id, each side's record, and the quarter scores", async () => {
    mockFetch([
      espnEvent({
        home: "BUF",
        away: "KC",
        id: "401",
        homeExtras: {
          records: [
            { type: "home", summary: "2-0" },
            { type: "total", summary: "4-1" },
          ],
          linescores: [
            { value: 7 },
            { value: 10 },
            { value: 3 },
            { value: 10 },
          ],
        },
        awayExtras: { records: [{ type: "total", summary: "3-2" }] },
      }),
    ]);
    const [result] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(result.id).toBe("401");
    expect(result.home.record).toBe("4-1");
    expect(result.away.record).toBe("3-2");
    expect(result.home.linescores).toEqual([7, 10, 3, 10]);
    // Nothing sent, so nothing to draw a row from.
    expect(result.away.linescores).toEqual([]);
  });

  it("carries the town the game is played in", async () => {
    mockFetch([
      espnEvent({
        home: "BUF",
        away: "KC",
        venue: { address: { city: "Orchard Park", state: "NY" } },
      }),
    ]);
    const [result] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(result.venue).toBe("Orchard Park, NY");
  });

  it("carries each side's logo, and neither where ESPN sent none", async () => {
    mockFetch([
      espnEvent({
        home: "BUF",
        away: "KC",
        homeExtras: {
          team: {
            displayName: "BUF Team",
            shortDisplayName: "BUF",
            abbreviation: "BUF",
            logo: "https://espn.com/buf.png",
          },
        },
      }),
    ]);
    const [result] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(result.home.team.logoUrl).toBe("https://espn.com/buf.png");
    expect(result.away.team.logoUrl).toBeUndefined();
  });

  it("leaves the venue out where ESPN sent no address for the ground", async () => {
    // A ground with no address, and no ground at all, are both a game with nowhere
    // to say it is played.
    mockFetch([espnEvent({ home: "BUF", away: "KC", venue: {} }), bufVsKc]);
    const [withVenue] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(withVenue.venue).toBeUndefined();

    mockFetch([bufVsKc]);
    const [withNone] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(withNone.venue).toBeUndefined();
  });
});

describe("getGameResult", () => {
  it("finds the game with that id, whoever picked it", async () => {
    mockFetch([
      espnEvent({ home: "BUF", away: "KC", id: "1" }),
      espnEvent({ home: "DAL", away: "PHI", id: "2" }),
    ]);
    const result = await getGameResult(League.PRO, WEEK, "2");
    expect(result?.shortName).toBe("PHI @ DAL");
  });

  it("comes back with nothing where the week no longer holds the game", async () => {
    mockFetch([espnEvent({ home: "BUF", away: "KC", id: "1" })]);
    expect(await getGameResult(League.PRO, WEEK, "9")).toBeNull();
  });

  it("finds a college game played before the week began", async () => {
    // The list a week is scored from drops these, because ESPN hands back the whole
    // bowl season at once. One being looked up by id was already chosen.
    mockFetch([
      espnEvent({
        home: "OSU",
        away: "MICH",
        id: "7",
        date: "2024-09-01T17:00Z",
      }),
    ]);
    const result = await getGameResult(League.COLLEGE, WEEK, "7");
    expect(result?.shortName).toBe("MICH @ OSU");
  });
});

describe("getLeagueResults, matchup filtering", () => {
  it("drops games nobody picked", async () => {
    mockFetch([bufVsKc, espnEvent({ home: "DAL", away: "PHI" })]);
    const results = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(results.map((it) => it.shortName)).toEqual(["KC @ BUF"]);
  });

  it("keeps a game when a one-sided matchup names either team", async () => {
    mockFetch([bufVsKc]);
    const results = await getLeagueResults(League.PRO, WEEK, [new Set(["KC"])]);
    expect(results).toHaveLength(1);
  });

  it("drops every game when a matchup names no teams", async () => {
    mockFetch([bufVsKc]);
    const results = await getLeagueResults(League.PRO, WEEK, [
      new Set<string>(),
    ]);
    expect(results).toHaveLength(0);
  });

  it("keeps the week where ESPN lists a side it has no team for", async () => {
    // A bowl slot still to be filled arrives with no abbreviation, and the type
    // says every side has one. One of those cannot cost the week its scoring.
    mockFetch([
      espnEvent({
        home: "TBD",
        away: "TBD",
        id: "2",
        homeExtras: { team: { displayName: "TBD" } } as Partial<EspnCompetitor>,
      }),
      bufVsKc,
    ]);
    const results = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(results.map((it) => it.shortName)).toEqual(["KC @ BUF"]);
  });
});

describe("getLeagueResults, what it does not ask twice", () => {
  const SEASON = 2024;
  const PHI_DAL = new Set(["PHI", "DAL"]);

  it("asks nothing more once every game of the week is over", async () => {
    const fetchMock = mockFetch([bufVsKc]);
    const first = await getLeagueResults(League.PRO, WEEK, [BUF_KC], SEASON);

    const again = await getLeagueResults(League.PRO, WEEK, [BUF_KC], SEASON);

    expect(urlsOf(fetchMock)).toHaveLength(1);
    expect(again).toEqual(first);
    // Through storage and back, so a date is a date rather than the text it was kept as.
    expect(again[0].date).toBeInstanceOf(Date);
  });

  it("asks again while a game is still being played", async () => {
    const fetchMock = mockFetch([
      espnEvent({ home: "BUF", away: "KC", status: GameStatus.LIVE }),
    ]);

    await getLeagueResults(League.PRO, WEEK, [BUF_KC], SEASON);
    await getLeagueResults(League.PRO, WEEK, [BUF_KC], SEASON);

    expect(urlsOf(fetchMock)).toHaveLength(2);
  });

  it("asks again when the picks name a matchup it has no answer for", async () => {
    const fetchMock = mockFetch([bufVsKc]);

    await getLeagueResults(League.PRO, WEEK, [BUF_KC], SEASON);
    // Every player picked the same side, so the column names one team, not two.
    await getLeagueResults(League.PRO, WEEK, [new Set(["BUF"])], SEASON);

    expect(urlsOf(fetchMock)).toHaveLength(2);
  });

  it("remembers a matchup ESPN listed no game for", async () => {
    const fetchMock = mockFetch([bufVsKc]);
    const matchups = [BUF_KC, PHI_DAL];

    const first = await getLeagueResults(League.PRO, WEEK, matchups, SEASON);
    const again = await getLeagueResults(League.PRO, WEEK, matchups, SEASON);

    expect(urlsOf(fetchMock)).toHaveLength(1);
    expect(first).toHaveLength(1);
    expect(again).toEqual(first);
  });

  it("keeps a finished game the next answer has stopped listing", async () => {
    const live = espnEvent({
      home: "PHI",
      away: "DAL",
      id: "2",
      status: GameStatus.LIVE,
    });
    const fetchMock = mockFetch([bufVsKc, live]);
    const matchups = [BUF_KC, PHI_DAL];
    await getLeagueResults(League.PRO, WEEK, matchups, SEASON);

    // ESPN moves a game out of a week's answer from time to time. Without the game it
    // held, the column would go from scored to missing.
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ events: [live] }),
    });
    const again = await getLeagueResults(League.PRO, WEEK, matchups, SEASON);

    expect(urlsOf(fetchMock)).toHaveLength(2);
    expect(again.map((it) => it.shortName).sort()).toEqual([
      "DAL @ PHI",
      "KC @ BUF",
    ]);
  });

  it("holds nothing from a week ESPN has not published", async () => {
    const fetchMock = mockFetch([]);

    await getLeagueResults(League.PRO, WEEK, [BUF_KC], SEASON);
    await getLeagueResults(League.PRO, WEEK, [BUF_KC], SEASON);

    expect(urlsOf(fetchMock)).toHaveLength(2);
  });

  it("asks again where no season was named, which names no week to hold", async () => {
    const fetchMock = mockFetch([bufVsKc]);

    await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    await getLeagueResults(League.PRO, WEEK, [BUF_KC]);

    expect(urlsOf(fetchMock)).toHaveLength(2);
  });

  it("gives a bowl week's later game first from what it held", async () => {
    const fetchMock = mockFetch([
      espnEvent({ home: "OSU", away: "MICH", date: "2024-10-02T17:00Z" }),
      espnEvent({
        home: "PSU",
        away: "IOWA",
        date: "2024-10-05T17:00Z",
        id: "2",
      }),
    ]);
    const matchups = [new Set(["OSU", "MICH"]), new Set(["PSU", "IOWA"])];
    await getLeagueResults(League.COLLEGE, WEEK, matchups, SEASON);

    const again = await getLeagueResults(
      League.COLLEGE,
      WEEK,
      matchups,
      SEASON,
    );

    // Both college groups answered with both games, and one game is held per matchup.
    expect(urlsOf(fetchMock)).toHaveLength(2);
    expect(again.map((it) => it.shortName)).toEqual([
      "IOWA @ PSU",
      "MICH @ OSU",
    ]);
  });
});

describe("getLeagueResults, a scoreboard request ESPN could not answer", () => {
  it("throws rather than reads events off an error response", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;

    await expect(getLeagueResults(League.PRO, WEEK, [BUF_KC])).rejects.toThrow(
      "503",
    );
  });

  it("throws rather than treat a body with no events array as an empty week", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    await expect(getLeagueResults(League.PRO, WEEK, [BUF_KC])).rejects.toThrow(
      /events/,
    );
  });

  it("throws for a college group the same way", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

    await expect(
      getLeagueResults(League.COLLEGE, WEEK, [new Set(["OSU", "MICH"])]),
    ).rejects.toThrow("500");
  });
});
