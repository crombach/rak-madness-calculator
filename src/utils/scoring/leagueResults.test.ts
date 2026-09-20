import { League } from "../../types/League";
import { LeagueResult } from "../../types/LeagueResult";
import { SEASON, week } from "../../weekFixtures";
import { getLeagueResults } from "../getLeagueResults";
import { LEAGUES } from "./gameColumns";
import {
  delayedGame,
  finalGame,
  liveGame,
  upcomingGame,
  weekOf,
} from "./leagueResultFixtures";
import { fetchLeagueResults, hasMoved, LeagueResults } from "./leagueResults";

vi.mock("../getLeagueResults");

const getLeagueResultsMock = vi.mocked(getLeagueResults);

const WEEK = week(5);
const NO_MATCHUPS = { college: [], pro: [] };

function pro(...results: Array<LeagueResult>): LeagueResults {
  return weekOf("pro", ...results);
}

const KICKED_OFF = liveGame({
  home: "BUF",
  away: "KC",
  homeScore: 7,
  awayScore: 0,
});

describe("hasMoved", () => {
  it("says so when a live game's score moves", () => {
    const after = pro(
      liveGame({ home: "BUF", away: "KC", homeScore: 14, awayScore: 0 }),
    );
    expect(hasMoved(["pro"], pro(KICKED_OFF), after)).toBe(true);
  });

  it("says so when a game the week has yet to kick off starts", () => {
    const before = pro(upcomingGame({ home: "BUF", away: "KC" }));
    expect(hasMoved(["pro"], before, pro(KICKED_OFF))).toBe(true);
  });

  it("says so when a game stops, and again when it starts again", () => {
    const stopped = pro(
      delayedGame({
        home: "BUF",
        away: "KC",
        homeScore: 7,
        awayScore: 0,
        period: 3,
      }),
    );
    expect(hasMoved(["pro"], pro(KICKED_OFF), stopped)).toBe(true);
    expect(hasMoved(["pro"], stopped, pro(KICKED_OFF))).toBe(true);
  });

  it("says nothing about a state it was already measured against", () => {
    expect(hasMoved(["pro"], pro(KICKED_OFF), pro(KICKED_OFF))).toBe(false);
  });

  it("says so for a game nobody is watching, since one fetch is the whole league", () => {
    const watched = finalGame({
      home: "BUF",
      away: "KC",
      homeScore: 24,
      awayScore: 14,
    });
    const other = { ...KICKED_OFF, id: "2" };
    const moved = {
      ...liveGame({ home: "SF", away: "SEA", homeScore: 10, awayScore: 3 }),
      id: "2",
    };
    expect(hasMoved(["pro"], pro(watched, other), pro(watched, moved))).toBe(
      true,
    );
  });

  it("says so for a game the pass before had nothing for", () => {
    expect(hasMoved(["pro"], pro(), pro(KICKED_OFF))).toBe(true);
  });

  it("says so where nothing at all is held, having no answer to measure against", () => {
    expect(hasMoved(["pro"], undefined, pro(KICKED_OFF))).toBe(true);
  });

  it("says nothing about a league it was not asked about", () => {
    const before = pro(KICKED_OFF);
    const after = pro(
      liveGame({ home: "BUF", away: "KC", homeScore: 14, awayScore: 0 }),
    );
    expect(hasMoved(["college"], before, after)).toBe(false);
  });

  it("ignores a clock and a down, which move without costing a rescore", () => {
    const ticked = pro({
      ...KICKED_OFF,
      clock: "2:00",
      period: 3,
      possession: { downDistanceText: "2nd & 7" },
      detailMessage: "3rd Quarter",
    });
    expect(hasMoved(["pro"], pro(KICKED_OFF), ticked)).toBe(false);
  });
});

describe("fetchLeagueResults", () => {
  beforeEach(() => {
    getLeagueResultsMock.mockResolvedValue([]);
  });

  it("fetches only the league it was named, keeping the other from the pass before", async () => {
    const held: LeagueResults = { college: [KICKED_OFF], pro: [] };
    getLeagueResultsMock.mockResolvedValue([KICKED_OFF]);

    const fetched = await fetchLeagueResults({
      leagues: ["pro"],
      week: WEEK,
      season: SEASON,
      matchups: NO_MATCHUPS,
      held,
    });

    expect(getLeagueResultsMock).toHaveBeenCalledOnce();
    expect(getLeagueResultsMock).toHaveBeenCalledWith(
      League.PRO,
      WEEK,
      [],
      SEASON,
    );
    expect(fetched.college).toBe(held.college);
    expect(fetched.pro).toEqual([KICKED_OFF]);
  });

  it("fetches a league it was not named when nothing is held for it", async () => {
    await fetchLeagueResults({
      leagues: ["pro"],
      week: WEEK,
      season: SEASON,
      matchups: NO_MATCHUPS,
    });

    expect(getLeagueResultsMock).toHaveBeenCalledTimes(2);
  });

  it("fetches both leagues when both are named", async () => {
    await fetchLeagueResults({
      leagues: LEAGUES,
      week: WEEK,
      season: SEASON,
      matchups: NO_MATCHUPS,
      held: { college: [KICKED_OFF], pro: [KICKED_OFF] },
    });

    expect(getLeagueResultsMock).toHaveBeenCalledTimes(2);
  });
});
