import { Mock, MockedFunction, vi } from "vitest";
import {
  ESPN_STATE,
  EspnCompetitor,
  EspnEvent,
  EspnPlay,
  EspnSituation,
  EspnStatus,
  GameStatus,
  HomeAway,
} from "../types/ESPN";
import { League, WeekInfo } from "../types/League";
import { getLeagueResults } from "./getLeagueResults";
import { stubFetch } from "../appTestFixtures";

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
  clock,
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
  situation?: EspnSituation;
  clock?: Pick<EspnStatus, "period" | "displayClock">;
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
      ...clock,
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
        situation,
        date,
        venue,
      },
    ],
  };
}

const PLAYS_HOST = "sports.core.api.espn.com";
const FINISH = "2024-10-06T20:13:01Z";

/** Every scoreboard resolves to `events`, and every game's last play ends at `FINISH`. */
function mockFetch(events: Array<EspnEvent>) {
  const fetchMock = vi.fn().mockImplementation(async (url: string) => ({
    ok: true,
    json: async () =>
      !url.includes(PLAYS_HOST)
        ? { events }
        : url.includes("page=")
          ? { items: [{ wallclock: FINISH, type: { id: "66" } }] }
          : { pageCount: 188 },
  }));
  stubFetch(fetchMock);
  return fetchMock;
}

/** The scoreboard requests, leaving out the plays a final game's finish is read off. */
function urlsOf(fetchMock: Mock): Array<string> {
  return fetchMock.mock.calls
    .map((call) => call[0])
    .filter((url) => url.includes("/scoreboard"));
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

  it("records the winner and the margin", async () => {
    mockFetch([bufVsKc]);
    const [result] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(result.winner.team?.abbreviation).toBe("BUF");
    expect(result.winner.homeAway).toBe(HomeAway.HOME);
    expect(result.winner.by).toBe(10);
  });

  it("leaves the winner unset for a tie", async () => {
    mockFetch([espnEvent({ home: "BUF", away: "KC", awayScore: 30 })]);
    const [result] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(result.winner.team).toBeNull();
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

  it("keeps a delayed game out of live, though ESPN calls its state `in`", async () => {
    const delayed = espnEvent({ home: "BUF", away: "KC" });
    delayed.status.period = 4;
    delayed.status.type = {
      id: GameStatus.DELAYED,
      state: "in",
      shortDetail: "Delayed",
    };
    mockFetch([delayed]);
    const [result] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(result.status).toBe(GameStatus.DELAYED);
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

  describe("where ESPN gives no side the ball", () => {
    const readLive = async (
      lastPlay: EspnPlay,
      situation: Omit<EspnSituation, "lastPlay"> = {},
      clock?: Pick<EspnStatus, "period" | "displayClock">,
      scores?: { homeScore: number; awayScore: number },
    ) => {
      mockFetch([
        espnEvent({
          home: "BUF",
          away: "KC",
          status: GameStatus.LIVE,
          situation: { ...situation, lastPlay },
          clock,
          ...scores,
        }),
      ]);
      const [result] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
      return result.possession;
    };

    it("gives the ball to whoever held it once a kickoff ended", async () => {
      const possession = await readLive(
        {
          type: { text: "Kickoff" },
          team: { id: "KC" },
          end: { team: { id: "BUF" } },
          probability: { secondsLeft: 2327 },
        },
        { downDistanceText: "1st & 10 at BUF 25" },
        { period: 2, displayClock: "8:47" },
      );
      expect(possession).toEqual({
        homeAway: HomeAway.HOME,
        downDistanceText: "1st & 10 @ BUF 25",
      });
    });

    it("has the side that scored a touchdown try for the extra point", async () => {
      const possession = await readLive(
        {
          type: { text: "Passing Touchdown" },
          scoreValue: 6,
          team: { id: "KC" },
          end: { team: { id: "KC" } },
        },
        { downDistanceText: "1st & Goal at BUF 3" },
      );
      expect(possession).toEqual({
        homeAway: HomeAway.AWAY,
        between: "KC extra point",
      });
    });

    it("has the side that missed a try kick off next", async () => {
      const possession = await readLive(
        {
          type: { text: "Extra Point Missed" },
          scoreValue: 0,
          start: { team: { id: "KC" } },
        },
        { down: -1 },
      );
      expect(possession).toEqual({ between: "KC to kick off" });
    });

    it("says the game is over before ESPN marks it final", async () => {
      const possession = await readLive(
        { type: { text: "End of Game" }, text: "END GAME" },
        { downDistanceText: "1st & 10 at BUF 25", possession: "KC" },
        { period: 4, displayClock: "0:00" },
      );
      expect(possession).toEqual({ between: "End of Game" });
    });

    it("names the kicker once the coin toss is done", async () => {
      const possession = await readLive({
        type: { text: "Coin Toss" },
        text: "GAME",
        start: { team: { id: "KC" } },
        end: { team: { id: "BUF" } },
      });
      expect(possession).toEqual({ between: "KC to kick off" });
    });

    it("says the coin toss where ESPN names no kicker", async () => {
      const possession = await readLive({ type: { text: "Coin Toss" } });
      expect(possession).toEqual({ between: "Coin Toss" });
    });

    it("has the side that kicked a field goal kick off next", async () => {
      const possession = await readLive({
        type: { text: "Field Goal Good" },
        scoreValue: 3,
        team: { id: "KC" },
        start: { team: { id: "KC" } },
        end: { team: { id: "KC" } },
      });
      expect(possession).toEqual({ between: "KC to kick off" });
    });

    it("drops the down a field goal ended", async () => {
      const possession = await readLive(
        {
          type: { text: "Field Goal Good" },
          scoreValue: 3,
          start: { team: { id: "KC" } },
        },
        { downDistanceText: "4th & 5 at BUF 20", possession: "KC" },
      );
      expect(possession).toEqual({
        homeAway: HomeAway.AWAY,
        between: "KC to kick off",
      });
    });

    it("has the side that gave up a safety kick off, whatever ESPN typed it", async () => {
      const possession = await readLive({
        type: { text: "Pass Incompletion" },
        scoreValue: 2,
        team: { id: "KC" },
        start: { team: { id: "BUF" } },
        end: { team: { id: "KC" } },
      });
      expect(possession.between).toBe("BUF to kick off");
    });

    it("reads a timeout's caller from the text, not the play's team", async () => {
      const possession = await readLive({
        type: { text: "Timeout" },
        text: "Timeout #1 by BUF at 02:00.",
        team: { id: "KC" },
        end: { team: { id: "KC" } },
      });
      expect(possession).toEqual({ timeout: "BUF T/O" });
    });

    it("reads a caller the pro play-by-play spells its own way", async () => {
      mockFetch([
        espnEvent({
          home: "BAL",
          away: "KC",
          status: GameStatus.LIVE,
          situation: {
            lastPlay: {
              type: { text: "Timeout" },
              text: "Timeout #2 by BLT at 08:12.",
            },
          },
        }),
      ]);
      const [result] = await getLeagueResults(League.PRO, WEEK, [
        new Set(["BAL", "KC"]),
      ]);
      expect(result.possession.timeout).toBe("BAL T/O");
    });

    it("reads a college caller by the team's location", async () => {
      mockFetch([
        espnEvent({
          home: "BUF",
          away: "KC",
          status: GameStatus.LIVE,
          awayExtras: {
            team: {
              displayName: "KC Team",
              abbreviation: "KC",
              location: "Kansas City",
            },
          },
          situation: {
            lastPlay: {
              type: { text: "Timeout" },
              text: "Timeout Kansas City, clock 08:47",
            },
          },
        }),
      ]);
      const [result] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
      expect(result.possession.timeout).toBe("KC T/O");
    });

    it("says the officials stopped play, and keeps the down", async () => {
      const possession = await readLive(
        {
          type: { text: "Official Timeout" },
          text: "Official Timeout at 11:42.",
          team: { id: "KC" },
        },
        { down: 2, downDistanceText: "2nd & 4 at BUF 22", possession: "KC" },
      );
      expect(possession).toEqual({
        homeAway: HomeAway.AWAY,
        downDistanceText: "2nd & 4 @ BUF 22",
        timeout: "Official T/O",
      });
    });

    it("names the kicker for a timeout the officials called after a score", async () => {
      const possession = await readLive(
        {
          type: { text: "Official Timeout" },
          text: "Official Timeout at 07:01.",
          team: { id: "KC" },
        },
        { down: -1 },
      );
      expect(possession).toEqual({
        between: "KC to kick off",
      });
    });

    /** A last play ESPN still holds a side and a down for, at `period`'s 0:00. */
    const readAtZero = (period: number, homeScore = 30, awayScore = 20) =>
      readLive(
        {
          type: { text: "Field Goal Good" },
          scoreValue: 3,
          start: { team: { id: "KC" } },
          end: { team: { id: "KC" } },
        },
        { downDistanceText: "1st & 10 at JAX 45", possession: "KC" },
        { period, displayClock: "0:00" },
        { homeScore, awayScore },
      );

    it("says no side has the ball, and no down, once the half runs out", async () => {
      expect(await readAtZero(2)).toEqual({});
    });

    it("says the game is over once regulation runs out with a side ahead", async () => {
      expect(await readAtZero(4)).toEqual({ between: "End of Game" });
    });

    it("says regulation is over once it runs out level", async () => {
      expect(await readAtZero(4, 20, 20)).toEqual({
        between: "End of Regulation",
      });
    });

    it("waits on the try after a touchdown levels the game as regulation runs out", async () => {
      const possession = await readLive(
        {
          type: { text: "Passing Touchdown" },
          scoreValue: 6,
          start: { team: { id: "KC" } },
          end: { team: { id: "KC" } },
        },
        {},
        { period: 4, displayClock: "0:00" },
        { homeScore: 20, awayScore: 20 },
      );
      expect(possession).toEqual({
        homeAway: HomeAway.AWAY,
        between: "KC extra point",
      });
    });

    it.each([
      ["the kickoff", "Kickoff"],
      ["a penalty on the kickoff", "Penalty"],
    ])("names the kicker while %s is to be kicked again", async (_, type) => {
      const possession = await readLive(
        {
          type: { text: type },
          text: "C.Dicker kicks 65 yards from KC 35 to landing zone to end zone, Touchback to the BUF 20.",
          start: { team: { id: "KC" } },
          end: { team: { id: "BUF" } },
        },
        { down: -1 },
      );
      expect(possession).toEqual({ between: "KC to kick off" });
    });

    it("drops a last play the clock has run well past", async () => {
      const possession = await readLive(
        {
          type: { text: "Kickoff" },
          end: { team: { id: "BUF" } },
          probability: { secondsLeft: 2400 },
        },
        {},
        { period: 2, displayClock: "8:38" },
      );
      expect(possession).toEqual({});
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
    stubFetch(
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }) as unknown as typeof fetch,
    );

    await expect(getLeagueResults(League.PRO, WEEK, [BUF_KC])).rejects.toThrow(
      "503",
    );
  });

  it("throws rather than treat a body with no events array as an empty week", async () => {
    stubFetch(
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }) as unknown as typeof fetch,
    );

    await expect(getLeagueResults(League.PRO, WEEK, [BUF_KC])).rejects.toThrow(
      /events/,
    );
  });

  it("throws for a college group the same way", async () => {
    stubFetch(
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }) as unknown as typeof fetch,
    );

    await expect(
      getLeagueResults(League.COLLEGE, WEEK, [new Set(["OSU", "MICH"])]),
    ).rejects.toThrow("500");
  });
});

describe("getLeagueResults, at halftime", () => {
  const HALF = { period: 2, displayClock: "0:00" };
  const HALF_ENDED = "2026-10-04T18:21:59Z";

  /** `mockFetch`, but the first play is a coin toss `kicker` started, and the last is `last`. */
  function mockFetchWithToss(
    events: Array<EspnEvent>,
    kicker: string,
    last: object = { type: { id: "65" }, wallclock: HALF_ENDED },
  ) {
    const fetchMock = mockFetch(events);
    const answer = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string) =>
      url.includes(PLAYS_HOST)
        ? {
            ok: true,
            json: async () =>
              url.includes("page=")
                ? { items: [last] }
                : {
                    pageCount: 87,
                    items: [
                      {
                        type: { text: "Coin Toss" },
                        start: {
                          team: { $ref: `http://x/teams/${kicker}?lang=en` },
                        },
                      },
                    ],
                  },
          }
        : answer(url),
    );
    return fetchMock;
  }

  it("has the side that kicked off the game receive after the break", async () => {
    mockFetchWithToss(
      [
        espnEvent({
          home: "BUF",
          away: "KC",
          id: "h1",
          status: GameStatus.LIVE,
          clock: HALF,
        }),
      ],
      "KC",
    );
    const [game] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(game.possession.between).toBe("KC to receive");
  });

  it("ends a pro halftime 13 minutes after the half did", async () => {
    mockFetchWithToss(
      [
        espnEvent({
          home: "BUF",
          away: "KC",
          id: "h3",
          status: GameStatus.LIVE,
          clock: HALF,
        }),
      ],
      "KC",
    );
    const [game] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(game.halftimeEndsAt).toEqual(new Date("2026-10-04T18:34:59Z"));
  });

  /** A kickoff ESPN's scoreboard shows as the half's clock runs out. */
  const kickoffAtTheHalf = (id: string) =>
    espnEvent({
      home: "BUF",
      away: "KC",
      id,
      status: GameStatus.LIVE,
      clock: HALF,
      situation: {
        downDistanceText: "1st & 10 at BUF 20",
        lastPlay: {
          type: { text: "Kickoff" },
          start: { team: { id: "KC" } },
          end: { team: { id: "BUF" } },
        },
      },
    });

  it("starts the second half at its kickoff, though ESPN still holds the half's clock", async () => {
    mockFetchWithToss([kickoffAtTheHalf("h4")], "KC", {
      type: { id: "53" },
      period: { number: 3 },
    });
    const [game] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect([game.period, game.clock]).toEqual([3, undefined]);
    expect(game.possession).toEqual({
      homeAway: HomeAway.HOME,
      downDistanceText: "1st & 10 @ BUF 20",
    });
    expect(game.halftimeEndsAt).toBeUndefined();
  });

  it("keeps halftime after a kickoff that ran out the half", async () => {
    mockFetchWithToss([kickoffAtTheHalf("h5")], "KC", {
      type: { id: "53" },
      period: { number: 2 },
    });
    const [game] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect([game.period, game.clock]).toEqual([2, "0:00"]);
    expect(game.possession).toEqual({ between: "KC to receive" });
  });

  it("asks nothing about the opening kickoff before the half", async () => {
    const fetchMock = mockFetchWithToss(
      [
        espnEvent({
          home: "BUF",
          away: "KC",
          id: "h2",
          status: GameStatus.LIVE,
          clock: { period: 2, displayClock: "4:12" },
        }),
      ],
      "KC",
    );
    const [game] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);
    expect(game.possession.between).toBeUndefined();
    expect(
      fetchMock.mock.calls.filter(([url]) => url.includes(PLAYS_HOST)),
    ).toEqual([]);
  });
});

describe("getLeagueResults, finish times", () => {
  const SEASON = 2024;

  /** `mockFetch`, but every plays request fails. */
  function mockFetchWithoutPlays(events: Array<EspnEvent>) {
    const fetchMock = mockFetch(events);
    const answer = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes(PLAYS_HOST)) throw new Error("offline");
      return answer(url);
    });
    return fetchMock;
  }

  const playsOf = (fetchMock: Mock): Array<string> =>
    fetchMock.mock.calls
      .map((call) => call[0])
      .filter((url) => url.includes(PLAYS_HOST));

  it("reads a final game's finish off its last play", async () => {
    const fetchMock = mockFetch([
      espnEvent({ home: "BUF", away: "KC", id: "f1" }),
    ]);

    const [game] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);

    expect(game.finishedAt).toEqual(new Date(FINISH));
    expect(playsOf(fetchMock)).toEqual([
      `https://${PLAYS_HOST}/v2/sports/football/leagues/nfl/events/f1/competitions/f1/plays?limit=1`,
      `https://${PLAYS_HOST}/v2/sports/football/leagues/nfl/events/f1/competitions/f1/plays?limit=1&page=188`,
    ]);
  });

  it("gives a live game no finish, and asks nothing about it", async () => {
    const fetchMock = mockFetch([
      espnEvent({ home: "BUF", away: "KC", id: "f2", status: GameStatus.LIVE }),
    ]);

    const [game] = await getLeagueResults(League.PRO, WEEK, [BUF_KC]);

    expect(game.finishedAt).toBeUndefined();
    expect(playsOf(fetchMock)).toEqual([]);
  });

  it("asks for a game's finish once", async () => {
    const fetchMock = mockFetch([
      espnEvent({ home: "BUF", away: "KC", id: "f3" }),
    ]);
    const matchups = [BUF_KC, new Set(["PHI", "DAL"])];
    await getLeagueResults(League.PRO, WEEK, [BUF_KC], SEASON);

    const [game] = await getLeagueResults(League.PRO, WEEK, matchups, SEASON);

    expect(game.finishedAt).toEqual(new Date(FINISH));
    expect(playsOf(fetchMock)).toHaveLength(2);
  });

  /** `mockFetch`, but each game's last plays page is `page`. */
  function mockFetchWithLastPage(events: Array<EspnEvent>, page: unknown) {
    const fetchMock = mockFetch(events);
    const answer = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("page=")
        ? { ok: true, json: async () => page }
        : answer(url),
    );
    return fetchMock;
  }

  it("holds a game ESPN has no plays for, with no finish", async () => {
    const fetchMock = mockFetchWithLastPage(
      [espnEvent({ home: "BUF", away: "KC", id: "f5" })],
      { items: [] },
    );

    const [game] = await getLeagueResults(League.PRO, WEEK, [BUF_KC], SEASON);
    await getLeagueResults(League.PRO, WEEK, [BUF_KC], SEASON);

    expect(game.finishedAt).toBeNull();
    expect(urlsOf(fetchMock)).toHaveLength(1);
  });

  it("asks again while the plays have not reached the end of the game", async () => {
    const fetchMock = mockFetchWithLastPage(
      [espnEvent({ home: "BUF", away: "KC", id: "f6" })],
      { items: [{ wallclock: FINISH, type: { id: "21" } }] },
    );

    const [game] = await getLeagueResults(League.PRO, WEEK, [BUF_KC], SEASON);
    await getLeagueResults(League.PRO, WEEK, [BUF_KC], SEASON);

    expect(game.finishedAt).toBeUndefined();
    expect(urlsOf(fetchMock)).toHaveLength(2);
  });

  it("still gives the game where its plays cannot be read, and asks again", async () => {
    const fetchMock = mockFetchWithoutPlays([
      espnEvent({ home: "BUF", away: "KC", id: "f4" }),
    ]);

    const [game] = await getLeagueResults(League.PRO, WEEK, [BUF_KC], SEASON);
    await getLeagueResults(League.PRO, WEEK, [BUF_KC], SEASON);

    expect(game.shortName).toBe("KC @ BUF");
    expect(game.finishedAt).toBeUndefined();
    expect(urlsOf(fetchMock)).toHaveLength(2);
  });
});
