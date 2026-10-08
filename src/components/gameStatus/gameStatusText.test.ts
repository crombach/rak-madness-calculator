import { LeagueResult } from "../../types/LeagueResult";
import { GameStatus } from "../../types/ESPN";
import {
  delayedGame,
  finalGame,
  liveGame,
  upcomingGame,
} from "../../utils/scoring/leagueResultFixtures";
import { countdownText, detailText } from "./gameStatusText";

describe("countdownText", () => {
  const NOW = new Date(2024, 9, 6, 10, 0);
  const inMinutes = (minutes: number) =>
    new Date(NOW.getTime() + minutes * 60_000);

  it("counts the minutes down inside the hour", () => {
    expect(countdownText(inMinutes(25), NOW)).toBe("Kickoff in 25m");
  });

  it("counts hours and minutes inside the day", () => {
    expect(countdownText(inMinutes(135), NOW)).toBe("Kickoff in 2h 15m");
    expect(countdownText(inMinutes(120), NOW)).toBe("Kickoff in 2h");
  });

  it("rounds up, so a kickoff seconds away is never said as now", () => {
    expect(countdownText(new Date(NOW.getTime() + 10_000), NOW)).toBe(
      "Kickoff in 1m",
    );
  });

  it("says tomorrow for a kickoff on the reader's next day", () => {
    expect(countdownText(new Date(2024, 9, 7, 0, 30), NOW)).toBe(
      "Kickoff tomorrow",
    );
    expect(countdownText(new Date(2024, 9, 7, 23, 0), NOW)).toBe(
      "Kickoff tomorrow",
    );
  });

  it("counts the reader's days alone past tomorrow", () => {
    expect(countdownText(new Date(2024, 9, 8, 1, 0), NOW)).toBe(
      "Kickoff in 2 days",
    );
    expect(countdownText(new Date(2024, 9, 13, 20, 0), NOW)).toBe(
      "Kickoff in 7 days",
    );
  });

  it("counts hours and minutes all the way to midnight", () => {
    expect(countdownText(new Date(2024, 9, 6, 23, 59), NOW)).toBe(
      "Kickoff in 13h 59m",
    );
  });

  it("says the game is about to start once its kickoff has passed", () => {
    expect(countdownText(inMinutes(-3), NOW)).toBe("Kicking off");
  });

  it("says the kickoff is to be decided where it has no time in it", () => {
    expect(countdownText(new Date(Number.NaN), NOW)).toBe("Kickoff TBD");
  });
});

const FINAL = finalGame({
  home: "BUF",
  away: "KC",
  homeScore: 30,
  awayScore: 20,
});
const LIVE = liveGame({ home: "BUF", away: "KC", homeScore: 7, awayScore: 0 });
const UPCOMING = upcomingGame({ home: "BUF", away: "KC" });
const DELAYED_IN_Q4 = delayedGame({
  home: "BUF",
  away: "KC",
  homeScore: 7,
  awayScore: 0,
  period: 4,
});

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
  it("says a game that went the four quarters is final", () => {
    expect(detailText(played(FINAL, 4))).toBe("Final");
  });

  it("marks a game that needed a fifth period as final after overtime", () => {
    expect(detailText(played(FINAL, 5))).toBe("Final/OT");
  });

  it("says a game yet to kick off in its own word, not ESPN's kickoff", () => {
    expect(detailText(UPCOMING)).toBe("Pregame");
  });

  it("says the quarter and the clock in the room between two scores", () => {
    expect(detailText({ ...LIVE, period: 3, clock: "8:42" })).toBe("Q3 8:42");
  });

  it("drops a clock at zero, which is a quarter that has ended", () => {
    expect(detailText({ ...LIVE, period: 3, clock: "0:00" })).toBe("Q3");
  });

  it("says the break in the middle by name, not as the quarter it ends", () => {
    expect(detailText({ ...LIVE, period: 2, clock: "0:00" })).toBe("Halftime");
  });

  it("says a game stopped part way through over the quarter it stopped in", () => {
    expect(detailText({ ...DELAYED_IN_Q4, clock: "8:11" })).toBe("Delayed Q4");
  });

  it("says a game stopped before kickoff in the word alone, not as a quarter", () => {
    // ESPN sends a period of zero for a game no quarter has been played in, which
    // read as a quarter would come out `Q0`.
    const delayed = delayedGame({
      home: "BUF",
      away: "KC",
      homeScore: 0,
      awayScore: 0,
      period: 0,
    });
    expect(detailText({ ...delayed, clock: "0:00" })).toBe("Delayed");
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
