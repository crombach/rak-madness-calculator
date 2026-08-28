import { GameStatus, HomeAway } from "../../types/ESPN";
import { LeagueResult } from "../../types/LeagueResult";
import { finalGame } from "./leagueResultFixtures";
import {
  getPickResults,
  getStatus,
  indexResultsByTeam,
} from "./getPickResults";

// BUF beat KC by 10.
const bufBeatKcBy10 = finalGame({
  home: "BUF",
  away: "KC",
  homeScore: 30,
  awayScore: 20,
});

function scoreOf(pick: string, results = [bufBeatKcBy10]): number {
  return getPickResults([pick], indexResultsByTeam(results))[0].pointValue;
}

describe("getPickResults, no spread", () => {
  it("awards a point for picking the winner", () => {
    expect(scoreOf("BUF")).toBe(1);
  });

  it("awards nothing for picking the loser", () => {
    expect(scoreOf("KC")).toBe(0);
  });

  it("is case-insensitive", () => {
    expect(scoreOf("buf")).toBe(1);
  });

  it("awards a point to both sides of a tie", () => {
    const tie = finalGame({
      home: "BUF",
      away: "KC",
      homeScore: 20,
      awayScore: 20,
    });
    expect(scoreOf("BUF", [tie])).toBe(1);
    expect(scoreOf("KC", [tie])).toBe(1);
  });
});

describe("getPickResults, favored pick (negative spread)", () => {
  it("awards a point when the favorite covers", () => {
    expect(scoreOf("BUF -7")).toBe(1);
  });

  it("awards nothing when the favorite wins but fails to cover", () => {
    expect(scoreOf("BUF -14")).toBe(0);
  });

  it("treats an exact-margin spread as a push and awards a point", () => {
    expect(scoreOf("BUF -10")).toBe(1);
  });

  it("awards nothing when the favorite loses outright", () => {
    expect(scoreOf("KC -7")).toBe(0);
  });
});

describe("getPickResults, underdog pick (positive spread)", () => {
  it("awards a point when the underdog wins outright", () => {
    expect(
      scoreOf("KC +7", [
        finalGame({ home: "BUF", away: "KC", homeScore: 20, awayScore: 30 }),
      ]),
    ).toBe(1);
  });

  it("awards a point when the underdog loses by less than the spread", () => {
    expect(scoreOf("KC +14")).toBe(1);
  });

  it("awards nothing when the underdog loses by more than the spread", () => {
    expect(scoreOf("KC +7")).toBe(0);
  });

  it("treats an exact-margin spread as a push and awards a point", () => {
    expect(scoreOf("KC +10")).toBe(1);
  });
});

describe("getPickResults, spread parsing", () => {
  it("accepts a half-point spread", () => {
    expect(scoreOf("BUF -9.5")).toBe(1);
    expect(scoreOf("BUF -10.5")).toBe(0);
  });

  it("accepts a spread with no space before the sign", () => {
    expect(scoreOf("BUF-7")).toBe(1);
  });

  it("reports hasSpread only when a spread was given", () => {
    expect(
      getPickResults(["BUF"], indexResultsByTeam([bufBeatKcBy10]))[0].hasSpread,
    ).toBe(false);
    expect(
      getPickResults(["BUF -7"], indexResultsByTeam([bufBeatKcBy10]))[0]
        .hasSpread,
    ).toBe(true);
  });
});

describe("getPickResults, missing data", () => {
  it("flags a pick whose game is absent", () => {
    const result = getPickResults(
      ["MIA"],
      indexResultsByTeam([bufBeatKcBy10]),
    )[0];
    expect(result.pointValue).toBe(0);
    expect(result.isInvalid).toBe(true);
    expect(result.explanation.header).toBe("Missing Game");
  });

  it("flags an empty pick as a missing pick, not a missing game", () => {
    const result = getPickResults(
      ["undefined"],
      indexResultsByTeam([bufBeatKcBy10]),
    )[0];
    expect(result.pointValue).toBe(0);
    expect(result.isInvalid).toBe(true);
    expect(result.explanation.header).toBe("Missing Pick");
  });
});

describe("getPickResults, game state", () => {
  it("marks a final game completed", () => {
    const result = getPickResults(
      ["BUF"],
      indexResultsByTeam([bufBeatKcBy10]),
    )[0];
    expect(result.isCompleted).toBe(true);
    expect(result.explanation.header).toBe("Final Score");
    expect(result.explanation.message).toBe("KC 20 - 30 BUF");
  });

  it("marks a live game incomplete and shows the possession arrow", () => {
    const live: LeagueResult = {
      ...bufBeatKcBy10,
      status: GameStatus.LIVE,
      detailMessage: "3rd Quarter",
      possession: { homeAway: HomeAway.AWAY, downDistanceText: "2nd & 7" },
    };
    const result = getPickResults(["BUF"], indexResultsByTeam([live]))[0];
    expect(result.isCompleted).toBe(false);
    expect(result.explanation.header).toBe("Live Score | 3rd Quarter");
    expect(result.explanation.message).toBe("▸ KC 20 - 30 BUF");
    expect(result.explanation.downDistanceText).toBe("2nd & 7");
  });

  it("marks an upcoming game incomplete", () => {
    const upcoming: LeagueResult = {
      ...bufBeatKcBy10,
      status: GameStatus.UPCOMING,
    };
    const result = getPickResults(["BUF"], indexResultsByTeam([upcoming]))[0];
    expect(result.isCompleted).toBe(false);
    expect(result.explanation.header).toBe("Upcoming");
    expect(result.explanation.message).toContain("KC @ BUF begins at");
  });

  it("formats the kickoff the way toLocale* did", () => {
    const upcoming: LeagueResult = {
      ...bufBeatKcBy10,
      status: GameStatus.UPCOMING,
    };
    const result = getPickResults(["BUF"], indexResultsByTeam([upcoming]))[0];
    // Expected through the API the shared formatters replaced, so the assertion
    // holds in whatever time zone the run is in.
    const { date } = upcoming;
    const time = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const day = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    expect(result.explanation.message).toBe(
      `KC @ BUF begins at ${time} on ${day}.`,
    );
  });
});

// GameStatus models only UPCOMING, LIVE, and FINAL, but `status` is assigned
// straight from ESPN's `status.type.id`, which has ids for postponed, canceled,
// and other states. Those reach the same default branch as a live game, so the
// header reads "Live Score" and ESPN's own detail message is what tells the
// reader the game is not being played.
describe("getPickResults, statuses outside the enum", () => {
  const POSTPONED = "6" as GameStatus;
  const CANCELED = "5" as GameStatus;

  it("labels a postponed game with the live header and ESPN's detail message", () => {
    const postponed: LeagueResult = {
      ...bufBeatKcBy10,
      status: POSTPONED,
      detailMessage: "Postponed",
    };
    const result = getPickResults(["BUF"], indexResultsByTeam([postponed]))[0];
    expect(result.isCompleted).toBe(false);
    expect(result.explanation.header).toBe("Live Score | Postponed");
  });

  it("awards a point to every pick in a canceled game, because it has no winner", () => {
    const canceled: LeagueResult = {
      ...bufBeatKcBy10,
      status: CANCELED,
      detailMessage: "Canceled",
      home: { ...bufBeatKcBy10.home, score: 0 },
      away: { ...bufBeatKcBy10.away, score: 0 },
      winner: { team: null, homeAway: null, by: 0 },
      loser: { team: null, homeAway: null, by: 0 },
      totalScore: 0,
    };
    const results = getPickResults(
      ["BUF", "KC"],
      indexResultsByTeam([canceled]),
    );
    expect(results.map((result) => result.pointValue)).toEqual([1, 1]);
    expect(results[0].isCompleted).toBe(false);
    expect(results[0].explanation.header).toBe("Live Score | Canceled");
  });
});

describe("getPickResults, ordering", () => {
  it("returns one result per pick, in order", () => {
    const results = getPickResults(
      ["KC", "BUF"],
      indexResultsByTeam([bufBeatKcBy10]),
    );
    expect(results.map((result) => result.pointValue)).toEqual([0, 1]);
  });
});

describe("getPickResults, unscoreable games", () => {
  const reason = 'Picks disagree about the spread: "BUF +7" and "KC -8".';

  function scoreFirstOfTwo(pick: string) {
    return getPickResults(
      [pick, "BUF"],
      indexResultsByTeam([bufBeatKcBy10]),
      new Map([[0, reason]]),
    );
  }

  it("scores nothing for a game the workbook describes two ways, and explains itself with the disagreement", () => {
    const [unscoreable] = scoreFirstOfTwo("BUF +7");

    expect(unscoreable.pointValue).toBe(0);
    expect(unscoreable.isInvalid).toBe(true);
    expect(unscoreable.isCompleted).toBe(false);
    expect(getStatus(unscoreable)).toBe("unscoreable");
    expect(unscoreable.explanation.header).toBe("Invalid Spread");
    expect(unscoreable.explanation.message).toBe(reason);
  });

  it("withholds the point even from the pick that would have won", () => {
    expect(scoreFirstOfTwo("BUF -3")[0].pointValue).toBe(0);
  });

  it("leaves the other games on the row alone", () => {
    expect(scoreFirstOfTwo("BUF +7")[1].pointValue).toBe(1);
  });
});
