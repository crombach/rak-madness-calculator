import { LeagueResult } from "../../types/LeagueResult";
import { GameStatus } from "../../types/ESPN";
import {
  finalGame,
  liveGame,
  upcomingGame,
} from "../../utils/scoring/leagueResultFixtures";
import { detailText } from "./gameStatusText";

const FINAL = finalGame({
  home: "BUF",
  away: "KC",
  homeScore: 30,
  awayScore: 20,
});
const LIVE = liveGame({ home: "BUF", away: "KC", homeScore: 7, awayScore: 0 });
const UPCOMING = upcomingGame({ home: "BUF", away: "KC" });

/** A game whose quarters, and whose overtimes, are known. */
function played(result: LeagueResult, periods: number): LeagueResult {
  const linescores = Array.from({ length: periods }, () => 0);
  return {
    ...result,
    home: { ...result.home, linescores },
    away: { ...result.away, linescores },
  };
}

describe("detailText", () => {
  it("says a game that went the four quarters as full time", () => {
    expect(detailText(played(FINAL, 4))).toBe("FT");
  });

  it("says a game that needed a fifth period as full time after overtime", () => {
    expect(detailText(played(FINAL, 5))).toBe("FT/OT");
  });

  it("says a game yet to kick off in its own word, not ESPN's kickoff", () => {
    expect(detailText(UPCOMING)).toBe("Pregame");
  });

  it("says the quarter and the clock in the room between two scores", () => {
    expect(detailText({ ...LIVE, period: 3, clock: "8:42" })).toBe("Q3 8:42");
  });

  it("drops a clock at zero, which is a quarter that has ended", () => {
    expect(detailText({ ...LIVE, period: 2, clock: "0:00" })).toBe("Q2");
  });

  it("keeps ESPN's own word for a stage the app has no short form for", () => {
    const postponed = {
      ...UPCOMING,
      status: "5" as GameStatus,
      detailMessage: "Postponed",
    };
    expect(detailText(postponed)).toBe("Postponed");
  });
});
