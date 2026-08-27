import { PlayerAnalysis } from "../../types/PlayerAnalysis";
import {
  PickResult,
  PlayerScore,
  RakMadnessScores,
  Status,
} from "../../types/RakMadnessScores";
import getPlayerAnalysis, { getSettledAnalysis } from "./getPlayerAnalysis";

/** A game still to be played unless a status says otherwise. */
function pick(text: string, status: Status = "incomplete"): PickResult {
  return { pick: text, status, explanation: { header: "", message: "" } };
}

type PlayerOptions = {
  name: string;
  college?: Array<PickResult>;
  pro?: Array<PickResult>;
  total?: number;
  collegeScore?: number;
  proAgainstTheSpread?: number;
  tiebreakerPick?: number;
  distance?: number;
  isKnockedOut?: boolean;
};

function player({
  name,
  college = [],
  pro = [],
  total = 0,
  collegeScore = 0,
  proAgainstTheSpread = 0,
  tiebreakerPick,
  distance,
  isKnockedOut = false,
}: PlayerOptions): PlayerScore {
  return {
    name,
    score: {
      total,
      college: collegeScore,
      pro: total - collegeScore,
      proAgainstTheSpread,
    },
    tiebreaker: { pick: tiebreakerPick, distance },
    college,
    pro,
    status: { hasNoPicks: false, isKnockedOut },
  };
}

function week(
  players: Array<PlayerScore>,
  tiebreaker?: number,
): RakMadnessScores {
  return { tiebreaker, scores: players };
}

/** Narrows to the routes result, so a case can read the fields it is about. */
function paths(result: PlayerAnalysis | undefined) {
  expect(result?.kind).toBe("paths");
  return result as Extract<PlayerAnalysis, { kind: "paths" }>;
}

function labels(games: Array<{ label: string }>): Array<string> {
  return games.map((game) => game.label);
}

describe("getPlayerAnalysis, whether there is anything to work out", () => {
  it("has no answer for a name the sheet does not hold", () => {
    const scores = week([player({ name: "Alice" })]);

    expect(getPlayerAnalysis(scores, "Nobody")).toBeUndefined();
  });

  it("gives a knocked out player the reason they already carry", () => {
    const scores = week([
      player({ name: "Alice", total: 5 }),
      player({
        name: "Bob",
        total: 0,
        isKnockedOut: true,
      }),
    ]);
    scores.scores[1].status.explanation =
      "Knocked out on Total Score by Alice.";

    expect(getPlayerAnalysis(scores, "Bob")).toEqual({
      kind: "knockedOut",
      player: "Bob",
      explanation: "Knocked out on Total Score by Alice.",
    });
  });

  it("clinches a week no remaining game can change", () => {
    // Both picked the same team, so the game moves both scores together and
    // cannot close the gap.
    const scores = week([
      player({ name: "Alice", total: 5, pro: [pick("KC -3")] }),
      player({ name: "Bob", total: 3, pro: [pick("KC -3")] }),
    ]);

    expect(getPlayerAnalysis(scores, "Alice")).toEqual({
      kind: "clinched",
      player: "Alice",
    });
  });

  it("clinches once every rival left is knocked out", () => {
    const scores = week([
      player({ name: "Alice", total: 5, pro: [pick("KC -3")] }),
      player({
        name: "Bob",
        total: 0,
        pro: [pick("DEN +3")],
        isKnockedOut: true,
      }),
    ]);

    expect(getPlayerAnalysis(scores, "Alice")).toEqual({
      kind: "clinched",
      player: "Alice",
    });
  });

  it("calls both winners of a decided week clinched", () => {
    // Level on every tier, which the knockouts leave standing together.
    const scores = week(
      [
        player({ name: "Alice", total: 5, pro: [pick("KC -3", "yes")] }),
        player({ name: "Bob", total: 5, pro: [pick("KC -3", "yes")] }),
      ],
      41,
    );

    expect(getPlayerAnalysis(scores, "Alice")).toEqual({
      kind: "clinched",
      player: "Alice",
    });
    expect(getPlayerAnalysis(scores, "Bob")).toEqual({
      kind: "clinched",
      player: "Bob",
    });
  });

  it("still gives a knocked out player their reason once a week is decided", () => {
    const scores = week(
      [
        player({ name: "Alice", total: 5, pro: [pick("KC -3", "yes")] }),
        player({
          name: "Bob",
          total: 3,
          pro: [pick("DEN +3", "no")],
          isKnockedOut: true,
        }),
      ],
      41,
    );
    scores.scores[1].status.explanation =
      "Knocked out on Total Score by Alice.";

    expect(getPlayerAnalysis(scores, "Bob")).toEqual({
      kind: "knockedOut",
      player: "Bob",
      explanation: "Knocked out on Total Score by Alice.",
    });
  });
});

// What the dialog asks before it puts a progress bar up, so a week that needs no
// search never stands one over an answer that is already there.
describe("getSettledAnalysis, the answers that need no search", () => {
  it("gives a knocked out player their reason", () => {
    const scores = week([
      player({ name: "Alice", total: 5 }),
      player({ name: "Bob", total: 0, isKnockedOut: true }),
    ]);
    scores.scores[1].status.explanation =
      "Knocked out on Total Score by Alice.";

    expect(getSettledAnalysis(scores, "Bob")).toEqual({
      kind: "knockedOut",
      player: "Bob",
      explanation: "Knocked out on Total Score by Alice.",
    });
  });

  // The case that sent a reader here: a week whose games are all in, where the
  // bar used to run over an answer the knockouts had already given.
  it("clinches a week whose games are all played", () => {
    const scores = week(
      [
        player({ name: "Alice", total: 5, pro: [pick("KC -3", "yes")] }),
        player({ name: "Bob", total: 3, pro: [pick("DEN +3", "no")] }),
      ],
      41,
    );

    expect(getSettledAnalysis(scores, "Alice")).toEqual({
      kind: "clinched",
      player: "Alice",
    });
  });

  it("clinches once every rival left is knocked out", () => {
    const scores = week([
      player({ name: "Alice", total: 5, pro: [pick("KC -3")] }),
      player({
        name: "Bob",
        total: 0,
        pro: [pick("DEN +3")],
        isKnockedOut: true,
      }),
    ]);

    expect(getSettledAnalysis(scores, "Alice")).toEqual({
      kind: "clinched",
      player: "Alice",
    });
  });

  it("sends a week still open to the search", () => {
    // Opposite picks on the one game left, so which of them takes it is exactly
    // what the search is for.
    const scores = week([
      player({ name: "Alice", total: 3, pro: [pick("KC -3")] }),
      player({ name: "Bob", total: 3, pro: [pick("DEN +3")] }),
    ]);

    expect(getSettledAnalysis(scores, "Alice")).toBeUndefined();
    expect(getPlayerAnalysis(scores, "Alice")).toBeDefined();
  });

  it("sends a name the sheet does not hold to the search, which has no answer either", () => {
    const scores = week([player({ name: "Alice" })]);

    expect(getSettledAnalysis(scores, "Nobody")).toBeUndefined();
    expect(getPlayerAnalysis(scores, "Nobody")).toBeUndefined();
  });
});

describe("getPlayerAnalysis, the routes", () => {
  it("names the one game a player has to win", () => {
    const scores = week([
      player({ name: "Alice", total: 3, pro: [pick("KC -3")] }),
      player({ name: "Bob", total: 3, pro: [pick("DEN +3")] }),
    ]);

    const result = paths(getPlayerAnalysis(scores, "Alice"));
    expect(result.mustWin).toEqual([{ label: "P1", pick: "KC -3" }]);
    expect(result.pool).toBeUndefined();
    expect(result.routes).toBeUndefined();
    expect(result.mondayNight).toEqual({ kind: "notNeeded" });
    expect(result.outrightAt).toBe(1);
  });

  it("reads a pool of interchangeable games as any two of them", () => {
    // Level on points with four games left that the two picked differently.
    // Each one Alice takes is one Bob does not, so two of any of them is enough.
    const alice = ["KC -3", "BUF -1", "SF -6", "GB -2"];
    const bob = ["DEN +3", "NYJ +1", "SEA +6", "CHI +2"];
    const scores = week([
      player({ name: "Alice", total: 2, pro: alice.map((it) => pick(it)) }),
      player({ name: "Bob", total: 2, pro: bob.map((it) => pick(it)) }),
    ]);

    const result = paths(getPlayerAnalysis(scores, "Alice"));
    expect(result.mustWin).toEqual([]);
    expect(result.pool?.choose).toBe(2);
    expect(labels(result.pool?.games ?? [])).toEqual(["P1", "P2", "P3", "P4"]);
    expect(result.hiddenRouteCount).toBe(0);
  });

  it("separates a must-win game from the pool behind it", () => {
    // Bob differs on P1 alone, Carl on P2 and P3 alone, so Alice needs P1 and
    // then either of the other two.
    const scores = week([
      player({
        name: "Alice",
        total: 0,
        pro: [pick("KC -3"), pick("BUF -1"), pick("SF -6")],
      }),
      player({
        name: "Bob",
        total: 1,
        pro: [pick("DEN +3"), pick("BUF -1"), pick("SF -6")],
      }),
      player({
        name: "Carl",
        total: 0,
        pro: [pick("KC -3"), pick("NYJ +1"), pick("SEA +6")],
      }),
    ]);

    const result = paths(getPlayerAnalysis(scores, "Alice"));
    expect(result.mustWin).toEqual([{ label: "P1", pick: "KC -3" }]);
    expect(result.pool?.choose).toBe(1);
    expect(labels(result.pool?.games ?? [])).toEqual(["P2", "P3"]);
  });

  it("lists the routes when they are not one pool of one size", () => {
    // P1 is worth two points against Bob, since the point Alice takes is one he
    // loses. P2 and P3 are worth one each, because Bob picked neither.
    const scores = week([
      player({
        name: "Alice",
        total: 0,
        pro: [pick("KC -3"), pick("BUF -1"), pick("SF -6")],
      }),
      player({
        name: "Bob",
        total: 1,
        pro: [pick("DEN +3"), pick(""), pick("")],
      }),
    ]);

    const result = paths(getPlayerAnalysis(scores, "Alice"));
    expect(result.mustWin).toEqual([]);
    expect(result.pool).toBeUndefined();
    expect(result.routes?.map((route) => labels(route.games))).toEqual([
      ["P1"],
      ["P2", "P3"],
    ]);
    expect(result.hiddenRouteCount).toBe(0);
  });
});

describe("getPlayerAnalysis, the Monday night tiebreaker", () => {
  it("bounds the totals that win from above when the player guessed lower", () => {
    // Level on points with nothing left to separate them but the guess. Alice is
    // closer than Bob on every total under the midpoint of 45.5.
    const scores = week([
      player({
        name: "Alice",
        total: 3,
        pro: [pick("KC -3")],
        tiebreakerPick: 40,
      }),
      player({
        name: "Bob",
        total: 3,
        pro: [pick("KC -3")],
        tiebreakerPick: 51,
      }),
    ]);

    const result = paths(getPlayerAnalysis(scores, "Alice"));
    expect(result.mustWin).toEqual([]);
    expect(result.mondayNight).toEqual({
      kind: "range",
      min: undefined,
      max: 45,
      rivals: ["Bob"],
    });
    expect(result.outrightAt).toBeUndefined();
  });

  it("bounds them from below when the player guessed higher", () => {
    const scores = week([
      player({
        name: "Alice",
        total: 3,
        pro: [pick("KC -3")],
        tiebreakerPick: 51,
      }),
      player({
        name: "Bob",
        total: 3,
        pro: [pick("KC -3")],
        tiebreakerPick: 40,
      }),
    ]);

    const result = paths(getPlayerAnalysis(scores, "Alice"));
    expect(result.mondayNight).toEqual({
      kind: "range",
      min: 46,
      max: undefined,
      rivals: ["Bob"],
    });
  });

  it("keeps an exact midpoint, where neither guess is closer and the tiers below decide", () => {
    // 40 and 50 sit either side of 45, and a total of 45 leaves both five off.
    // Alice's better college score takes it from there.
    const scores = week([
      player({
        name: "Alice",
        total: 3,
        collegeScore: 2,
        pro: [pick("KC -3")],
        tiebreakerPick: 50,
      }),
      player({
        name: "Bob",
        total: 3,
        collegeScore: 1,
        pro: [pick("KC -3")],
        tiebreakerPick: 40,
      }),
    ]);

    const result = paths(getPlayerAnalysis(scores, "Alice"));
    expect(result.mondayNight).toEqual({
      kind: "range",
      min: 45,
      max: undefined,
      rivals: ["Bob"],
    });
  });

  it("says which win takes the week whatever the total is", () => {
    // P1 is worth two points against Bob and P2 only one, because he left P2
    // blank. So P1 alone pulls Alice clear, while P2 alone only draws her level
    // and hands the week to the guesses, where she is the closer of the two on
    // anything under the midpoint of 32.5.
    const scores = week([
      player({
        name: "Alice",
        total: 3,
        pro: [pick("KC -3"), pick("BUF -1")],
        tiebreakerPick: 20,
      }),
      player({
        name: "Bob",
        total: 3,
        pro: [pick("DEN +3"), pick("")],
        tiebreakerPick: 45,
      }),
    ]);

    const result = paths(getPlayerAnalysis(scores, "Alice"));
    expect(result.mustWin).toEqual([]);
    expect(result.outrightAt).toBe(1);
    expect(result.mondayNight).toBeUndefined();
    expect(result.routes).toEqual([
      {
        games: [{ label: "P1", pick: "KC -3" }],
        mondayNight: { kind: "notNeeded" },
      },
      {
        games: [{ label: "P2", pick: "BUF -1" }],
        mondayNight: {
          kind: "range",
          min: undefined,
          max: 32,
          rivals: ["Bob"],
        },
      },
    ]);
  });

  it("falls to the college score where both guessed the same total", () => {
    const scores = week([
      player({
        name: "Alice",
        total: 3,
        collegeScore: 2,
        pro: [pick("KC -3")],
        tiebreakerPick: 45,
      }),
      player({
        name: "Bob",
        total: 3,
        collegeScore: 1,
        pro: [pick("KC -3")],
        tiebreakerPick: 45,
      }),
    ]);

    expect(getPlayerAnalysis(scores, "Alice")).toEqual({
      kind: "clinched",
      player: "Alice",
    });
  });

  it("reads the tiebreaker as settled once its game is final", () => {
    // The Monday night total is in, so the distances decide and no range is left
    // to work out. A college game is still open, which keeps the week going.
    const scores = week(
      [
        player({
          name: "Alice",
          total: 3,
          college: [pick("UGA -7")],
          tiebreakerPick: 44,
          distance: 3,
        }),
        player({
          name: "Bob",
          total: 3,
          college: [pick("BAMA +7")],
          tiebreakerPick: 40,
          distance: 7,
        }),
      ],
      47,
    );

    const result = paths(getPlayerAnalysis(scores, "Bob"));
    expect(result.mustWin).toEqual([{ label: "C1", pick: "BAMA +7" }]);
    expect(result.mondayNight).toEqual({ kind: "settled" });
  });
});

describe("getPlayerAnalysis, games out of the player's hands", () => {
  it("names the team that has to miss where the player left a game blank", () => {
    const scores = week([
      player({ name: "Alice", total: 3, pro: [pick("")] }),
      player({ name: "Bob", total: 3, pro: [pick("KC -3")] }),
    ]);

    const result = paths(getPlayerAnalysis(scores, "Alice"));
    expect(result.mustWin).toEqual([]);
    expect(result.needsHelp).toEqual([{ label: "P1", needsToMiss: ["KC"] }]);
  });

  it("counts the routes wanting those games to fall some other way", () => {
    // Winning P1 is enough, and so is winning P3, but the two need P2 and P4 to
    // fall different ways. Only the P1 route is spelled out, since `needsHelp` is
    // written once for every route shown, so the other is counted instead.
    const scores = week([
      player({
        name: "Alice",
        total: 1,
        pro: [pick("KC -3"), pick(""), pick("SEA +6"), pick("")],
      }),
      player({
        name: "Bob",
        total: 1,
        pro: [pick("KC -3"), pick("BUF -1"), pick(""), pick("CHI -2")],
      }),
      player({
        name: "Carl",
        total: 1,
        pro: [pick("DEN +3"), pick("NYJ +1"), pick(""), pick("")],
      }),
    ]);

    const result = paths(getPlayerAnalysis(scores, "Alice"));
    expect(result.mustWin).toEqual([{ label: "P1", pick: "KC -3" }]);
    expect(result.routes).toEqual([
      { games: [], mondayNight: { kind: "notNeeded" } },
    ]);
    expect(result.hiddenRouteCount).toBe(1);
    expect(result.needsHelp).toEqual([
      { label: "P2", needsToMiss: ["BUF"] },
      { label: "P4", needsToMiss: ["CHI"] },
    ]);
  });

  it("leaves it empty where a route wins however that game falls", () => {
    const scores = week([
      player({ name: "Alice", total: 5, pro: [pick("")] }),
      player({ name: "Bob", total: 3, pro: [pick("KC -3")] }),
    ]);

    expect(getPlayerAnalysis(scores, "Alice")).toEqual({
      kind: "clinched",
      player: "Alice",
    });
  });
});

describe("getPlayerAnalysis, weeks too big to search", () => {
  /** Two sides of one game, on the same spread, so no tiebreaker tier splits them. */
  function opposed(count: number, prefix: string, spread: string) {
    return Array.from({ length: count }, (_, index) =>
      pick(`${prefix}${index} ${spread}`),
    );
  }

  it("gives a floor rather than routes above ten open games", () => {
    // Eleven games the two picked differently, Alice five points back. Each one
    // she takes is one Bob does not, so eight of them draw her level and a ninth
    // takes it outright.
    const count = 11;
    const scores = week([
      player({
        name: "Alice",
        total: 0,
        pro: opposed(count, "A", "-3"),
      }),
      player({
        name: "Bob",
        total: 5,
        pro: opposed(count, "B", "+3"),
      }),
    ]);

    expect(getPlayerAnalysis(scores, "Alice")).toEqual({
      kind: "headline",
      player: "Alice",
      remainingPickCount: 11,
      minimumWins: 8,
      needsMondayNight: true,
    });
  });

  it("leaves Monday night out where winning enough clears every rival", () => {
    // The same eleven games with Alice four points back. Eight of them put her on
    // eight and Bob on seven, so the count that draws her level is the count that
    // takes the week, and the guesses never come into it.
    const count = 11;
    const scores = week([
      player({ name: "Alice", total: 0, pro: opposed(count, "A", "-3") }),
      player({ name: "Bob", total: 4, pro: opposed(count, "B", "+3") }),
    ]);

    expect(getPlayerAnalysis(scores, "Alice")).toEqual({
      kind: "headline",
      player: "Alice",
      remainingPickCount: 11,
      minimumWins: 8,
      needsMondayNight: false,
    });
  });

  it("counts the games left, whether or not they are in dispute", () => {
    // Eleven games left, ten of them picked the same way by both. Only one can
    // change the order, and a week this far out still gives a floor rather than
    // routes.
    const agreed = Array.from({ length: 10 }, (_, index) =>
      pick(`S${index} -3`),
    );
    const scores = week([
      player({ name: "Alice", total: 0, pro: [...agreed, pick("KC -3")] }),
      player({ name: "Bob", total: 1, pro: [...agreed, pick("DEN +3")] }),
    ]);

    expect(getPlayerAnalysis(scores, "Alice")?.kind).toBe("headline");
  });

  it("works the routes out at ten", () => {
    const count = 10;
    const scores = week([
      player({ name: "Alice", total: 0, pro: opposed(count, "A", "-3") }),
      player({ name: "Bob", total: 0, pro: opposed(count, "B", "+3") }),
    ]);

    const result = paths(getPlayerAnalysis(scores, "Alice"));
    expect(result.pool?.choose).toBe(5);
    expect(result.pool?.games).toHaveLength(10);
  });
});
