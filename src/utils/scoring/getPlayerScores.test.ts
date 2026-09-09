import * as XLSX from "xlsx-js-style";
import { League, WeekInfo } from "../../types/League";
import { LeagueResult } from "../../types/LeagueResult";
import { getLeagueResults } from "../getLeagueResults";
import { getPlayerScores } from "./getPlayerScores";
import { finalGame, upcomingGame } from "./leagueResultFixtures";

vi.mock("../getLeagueResults");

const mockGetLeagueResults = vi.mocked(getLeagueResults);

const WEEK: WeekInfo = {
  value: 5,
  label: "Week 5",
  startDate: new Date("2024-10-01T00:00:00Z"),
  endDate: new Date("2024-10-08T00:00:00Z"),
};

const osuBeatMichBy10 = finalGame({
  home: "OSU",
  away: "MICH",
  homeScore: 31,
  awayScore: 21,
});
const bufBeatKcBy10 = finalGame({
  home: "BUF",
  away: "KC",
  homeScore: 30,
  awayScore: 20,
});
const bufVsKcUpcoming = upcomingGame({ home: "BUF", away: "KC" });
// The tiebreaker game. 41 combined points.
const dalBeatPhiBy7 = finalGame({
  home: "DAL",
  away: "PHI",
  homeScore: 24,
  awayScore: 17,
});
const TIEBREAKER_TOTAL = 41;

/**
 * Column order matters. `getPlayerScores` treats the column immediately before
 * `Pts` as the tiebreaker game, so `P2` is the tiebreaker throughout this file.
 */
type PickRow = {
  Name: string;
  C1?: string;
  P1?: string;
  P2?: string;
  Pts?: number;
};

function picksBuffer(rows: Array<PickRow>, sheetName = "Picks"): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(rows),
    sheetName,
  );
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" });
}

/** P1 has not kicked off, so the leader still has one game outstanding. */
function withP1Upcoming() {
  mockGetLeagueResults.mockImplementation(async (league: League) =>
    league === League.COLLEGE
      ? [osuBeatMichBy10]
      : [bufVsKcUpcoming, dalBeatPhiBy7],
  );
}

/** Every game is final, so nothing is outstanding and no one can catch up. */
function withEverythingFinal() {
  mockGetLeagueResults.mockImplementation(async (league: League) =>
    league === League.COLLEGE
      ? [osuBeatMichBy10]
      : [bufBeatKcBy10, dalBeatPhiBy7],
  );
}

function namesOf(scores: Array<{ name: string }>): Array<string> {
  return scores.map((score) => score.name);
}

beforeEach(() => {
  withP1Upcoming();
});

describe("getPlayerScores, spreadsheet parsing", () => {
  it("returns one entry per player row", async () => {
    const result = await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", P2: "DAL -3", Pts: 41 },
        { Name: "Bob", C1: "MICH +3", P1: "KC +7", P2: "PHI +3", Pts: 45 },
      ]),
    );
    expect(namesOf(result.scores)).toEqual(["Alice", "Bob"]);
  });

  it("scores a game the first player left blank", async () => {
    // `json_to_sheet` writes the header from the union of the rows, and
    // `sheet_to_json` leaves Alice's blank P2 out of her object. Read from her row
    // alone, P2 would be nobody's game and P1 would decide the tiebreaker.
    const result = await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", Pts: 41 },
        { Name: "Bob", C1: "MICH +3", P1: "KC +7", P2: "PHI +3", Pts: 45 },
      ]),
    );

    const byName = new Map(result.scores.map((score) => [score.name, score]));
    expect(byName.get("Alice")?.pro.map((it) => it.pick)).toEqual([
      "BUF -7",
      undefined,
    ]);
    expect(byName.get("Bob")?.pro.map((it) => it.pick)).toEqual([
      "KC +7",
      "PHI +3",
    ]);
  });

  it("reads C columns as college and P columns as pro, excluding Pts", async () => {
    const result = await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", P2: "DAL -3", Pts: 41 },
      ]),
    );
    expect(result.scores[0].college.map((it) => it.pick)).toEqual(["OSU -3"]);
    expect(result.scores[0].pro.map((it) => it.pick)).toEqual([
      "BUF -7",
      "DAL -3",
    ]);
  });

  it("derives each game's matchup from every player's pick", async () => {
    await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", P2: "DAL -3", Pts: 41 },
        { Name: "Bob", C1: "MICH +3", P1: "KC +7", P2: "PHI +3", Pts: 45 },
      ]),
    );
    expect(mockGetLeagueResults).toHaveBeenCalledWith(
      League.COLLEGE,
      WEEK,
      [new Set(["OSU", "MICH"])],
      undefined,
    );
    expect(mockGetLeagueResults).toHaveBeenCalledWith(
      League.PRO,
      WEEK,
      [new Set(["BUF", "KC"]), new Set(["DAL", "PHI"])],
      undefined,
    );
  });

  // A game everybody took the same side of names one team, and that is enough to
  // find it. Without this, a sheet needs a made-up player holding the other side.
  it("scores a game every row picked the same way", async () => {
    withEverythingFinal();
    const result = await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", P2: "DAL -3", Pts: 41 },
        { Name: "Bob", C1: "OSU -3", P1: "KC +7", P2: "PHI +3", Pts: 45 },
      ]),
    );

    expect(mockGetLeagueResults).toHaveBeenCalledWith(
      League.COLLEGE,
      WEEK,
      [new Set(["OSU"])],
      undefined,
    );
    expect(result.scores.map((score) => score.college[0].status)).toEqual([
      "yes",
      "yes",
    ]);
  });

  it("reads the first sheet in the workbook, whatever it is named", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", P2: "DAL -3", Pts: 41 },
      ]),
      "Week 5 Picks",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["ignored"]]),
      "Notes",
    );
    const result = await getPlayerScores(
      WEEK,
      XLSX.write(workbook, { bookType: "xlsx", type: "array" }),
    );
    expect(namesOf(result.scores)).toEqual(["Alice"]);
  });
});

describe("getPlayerScores, scoring", () => {
  it("splits the total into college and pro", async () => {
    withEverythingFinal();
    const result = await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", P2: "DAL -3", Pts: 41 },
      ]),
    );
    expect(result.scores[0].score).toEqual({
      total: 3,
      college: 1,
      pro: 2,
      proAgainstTheSpread: 2,
    });
  });

  it("leaves games that are not final out of the score", async () => {
    const result = await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", P2: "DAL -3", Pts: 41 },
      ]),
    );
    expect(result.scores[0].score.pro).toBe(1);
    expect(result.scores[0].pro[0].status).toBe("incomplete");
    expect(result.scores[0].pro[1].status).toBe("yes");
  });

  it("counts only pro picks that carry a spread toward the ATS score", async () => {
    withEverythingFinal();
    const result = await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Alice", C1: "OSU -3", P1: "BUF", P2: "DAL -3", Pts: 41 },
      ]),
    );
    expect(result.scores[0].score.pro).toBe(2);
    expect(result.scores[0].score.proAgainstTheSpread).toBe(1);
  });

  it("marks a pick whose game is missing as an error", async () => {
    const result = await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", P2: "MIA -3", Pts: 41 },
      ]),
    );
    expect(result.scores[0].pro[1].status).toBe("unscoreable");
  });
});

describe("getPlayerScores, tiebreaker", () => {
  it("uses the combined score of the game in the column before Pts", async () => {
    const result = await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", P2: "DAL -3", Pts: 41 },
      ]),
    );
    expect(result.tiebreaker).toBe(TIEBREAKER_TOTAL);
  });

  it("reports each player's distance from that combined score", async () => {
    const result = await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", P2: "DAL -3", Pts: 41 },
        { Name: "Bob", C1: "MICH +3", P1: "KC +7", P2: "PHI +3", Pts: 45 },
      ]),
    );
    const distances = Object.fromEntries(
      result.scores.map((score) => [score.name, score.tiebreaker.distance]),
    );
    expect(distances).toEqual({ Alice: 0, Bob: 4 });
  });

  it("leaves the tiebreaker undefined while its game is unfinished", async () => {
    mockGetLeagueResults.mockImplementation(async (league: League) =>
      league === League.COLLEGE
        ? [osuBeatMichBy10]
        : [bufBeatKcBy10, upcomingGame({ home: "DAL", away: "PHI" })],
    );
    const result = await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", P2: "DAL -3", Pts: 41 },
      ]),
    );
    expect(result.tiebreaker).toBeUndefined();
    expect(result.scores[0].tiebreaker.distance).toBeUndefined();
  });
});

describe("getPlayerScores, ranking", () => {
  // The tiebreaker cascade itself is `comparePlayerScores.test.ts`. These two
  // only prove the pipeline sorts at all, and works out `hasNoPicks` to sort by.
  it("ranks by total score, highest first", async () => {
    const result = await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Bob", C1: "MICH +3", P1: "KC +7", P2: "PHI +3", Pts: 45 },
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", P2: "DAL -3", Pts: 41 },
      ]),
    );
    expect(namesOf(result.scores)).toEqual(["Alice", "Bob"]);
  });

  it("ranks players who submitted no picks last", async () => {
    const result = await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", P2: "DAL -3", Pts: 41 },
        { Name: "Bob", Pts: 41 },
      ]),
    );
    expect(namesOf(result.scores)).toEqual(["Alice", "Bob"]);
    expect(result.scores[1].status.hasNoPicks).toBe(true);
  });
});

describe("getPlayerScores, knockouts", () => {
  // The rules themselves are `applyKnockouts.test.ts`. This only proves the
  // pipeline carries what it decided out to the caller.
  it("carries each player's knockout status through the pipeline", async () => {
    const result = await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", P2: "DAL -3", Pts: 41 },
        { Name: "Bob", C1: "MICH +3", P1: "BUF -7", P2: "PHI +3", Pts: 45 },
      ]),
    );
    expect(result.scores[0].status.isKnockedOut).toBe(false);
    expect(result.scores[0].status.explanation).toBe("Winner!");
  });
});

describe("getPlayerScores, blank picks", () => {
  it("reports a row that left one game blank, and knocks it out", async () => {
    const result = await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", Pts: 41 },
        { Name: "Bob", C1: "MICH +3", P1: "KC +7", P2: "PHI +3", Pts: 45 },
      ]),
    );

    const byName = new Map(result.scores.map((score) => [score.name, score]));
    expect(byName.get("Alice")?.status.hasBlankPick).toBe(true);
    expect(byName.get("Alice")?.status.hasNoPicks).toBe(false);
    expect(byName.get("Alice")?.status.isKnockedOut).toBe(true);
    expect(byName.get("Bob")?.status.hasBlankPick).toBe(false);
  });

  it("reads a game the workbook contradicts as no blank of the player's", async () => {
    // A column nobody can be scored on is the sheet's problem, not the row's, so
    // it leaves every row still able to win.
    const result = await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", P2: "DAL -3", Pts: 41 },
        { Name: "Bob", C1: "MICH +9", P1: "KC +7", P2: "PHI +3", Pts: 45 },
      ]),
    );

    expect(result.scores.every((score) => !score.status.hasBlankPick)).toBe(
      true,
    );
  });
});

describe("getPlayerScores, league requests", () => {
  it("asks for both leagues for the given week", async () => {
    const collegeOnly: Array<LeagueResult> = [osuBeatMichBy10];
    mockGetLeagueResults.mockImplementation(async (league: League) =>
      league === League.COLLEGE ? collegeOnly : [bufBeatKcBy10, dalBeatPhiBy7],
    );
    await getPlayerScores(
      WEEK,
      picksBuffer([
        { Name: "Alice", C1: "OSU -3", P1: "BUF -7", P2: "DAL -3", Pts: 41 },
      ]),
    );
    expect(mockGetLeagueResults).toHaveBeenCalledTimes(2);
    const leagues = mockGetLeagueResults.mock.calls.map((call) => call[0]);
    expect(leagues).toContain(League.COLLEGE);
    expect(leagues).toContain(League.PRO);
  });
});

describe("getPlayerScores, spreads the workbook contradicts", () => {
  // KC's spread should be +7 against Alice's BUF -7. It is not, so there is no
  // way to know which number the pool was playing.
  const contradictoryP1 = [
    { Name: "Alice", C1: "OSU -3", P1: "BUF -7", P2: "DAL -3", Pts: 41 },
    { Name: "Bob", C1: "MICH +3", P1: "KC -8", P2: "PHI +3", Pts: 45 },
  ];

  beforeEach(() => {
    withEverythingFinal();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("scores the game for nobody, and says why in the cell", async () => {
    const result = await getPlayerScores(WEEK, picksBuffer(contradictoryP1));

    result.scores.forEach((score) => {
      expect(score.pro[0].status).toBe("unscoreable");
      expect(score.pro[0].explanation.header).toBe("Invalid Spread");
      expect(score.pro[0].explanation.message).toBe(
        'Picks disagree about the spread: "BUF -7" and "KC -8".',
      );
    });
  });

  it("leaves every other game on the row scored", async () => {
    const result = await getPlayerScores(WEEK, picksBuffer(contradictoryP1));
    const alice = result.scores.find((score) => score.name === "Alice");

    // OSU and DAL both covered, and P1 is the game that cannot be scored.
    expect(alice?.score).toEqual({
      total: 2,
      college: 1,
      pro: 1,
      proAgainstTheSpread: 1,
    });
    expect(alice?.pro[1].status).toBe("yes");
  });

  it("reports the workbook problem to the console", async () => {
    await getPlayerScores(WEEK, picksBuffer(contradictoryP1));

    expect(console.error).toHaveBeenCalledWith(
      'Cannot score game P1. Picks disagree about the spread: "BUF -7" and "KC -8".',
    );
  });
});
