import { League } from "../../types/League";
import { PlayerScore } from "../../types/RakMadnessScores";
import { PlayerAnalysis } from "../../types/PlayerAnalysis";
import getPlayerAnalysis, { MAX_SEARCHED_GAMES } from "./getPlayerAnalysis";
import getKnockouts, { KnockoutGames } from "./getKnockouts";
import parsePick from "./parsePick";
import { finalGame, upcomingGame } from "./leagueResultFixtures";
import applyKnockouts from "./applyKnockouts";
import comparePlayerScores from "./comparePlayerScores";
import { pick, player, week } from "./scoringTestFixtures";

/** A finished week, knocked out as the scoring pass would. */
function settled(players: Array<PlayerScore>, tiebreaker: number) {
  return week(
    applyKnockouts([...players].sort(comparePlayerScores), tiebreaker),
    tiebreaker,
  );
}

describe("getKnockouts", () => {
  it("groups the players who need the same side of a game", () => {
    // KC ties all three, and a tie is a win for each. DEN puts Carol two clear.
    const scores = week([
      player({ name: "Carol", total: 5, pro: [pick("DEN")] }),
      player({ name: "Alice", total: 4, pro: [pick("KC")] }),
      player({ name: "Bob", total: 4, pro: [pick("KC")] }),
    ]);
    scores.games = [{ label: "P1", league: League.PRO, name: "KC at DEN" }];

    expect(getKnockouts(scores)).toEqual({
      games: [
        {
          label: "P1",
          name: "KC at DEN",
          isFinal: false,
          sides: [{ team: "KC", pick: "KC", players: ["Alice", "Bob"] }],
        },
      ],
    });
  });

  it("names both sides of a game each side needs", () => {
    const scores = week([
      player({ name: "Alice", total: 5, pro: [pick("KC -3")] }),
      player({ name: "Bob", total: 5, pro: [pick("DEN 3")] }),
    ]);

    expect(getKnockouts(scores).games).toEqual([
      {
        label: "P1",
        name: "P1",
        isFinal: false,
        sides: [
          { team: "KC", pick: "KC -3", players: ["Alice"] },
          { team: "DEN", pick: "DEN +3", players: ["Bob"] },
        ],
      },
    ]);
  });

  it("puts the away side first, as the game is named, even where home holds more", () => {
    const scores = week([
      player({ name: "Alice", total: 5, pro: [pick("KC -3")] }),
      player({ name: "Bob", total: 5, pro: [pick("DEN 3")] }),
      player({ name: "Carol", total: 5, pro: [pick("DEN 3")] }),
    ]);
    scores.games = [
      {
        label: "P1",
        league: League.PRO,
        name: "KC at DEN",
        result: upcomingGame({ home: "DEN", away: "KC" }),
      },
    ];

    expect(getKnockouts(scores).games[0].sides).toEqual([
      { team: "KC", pick: "KC -3", players: ["Alice"] },
      { team: "DEN", pick: "DEN +3", players: ["Bob", "Carol"] },
    ]);
  });

  it("leaves out knocked out, clinched, and repeated-name players", () => {
    // Alice holds the week on DEN too, level with Bob. Dan would need DEN if the
    // knockouts had left him in, and so would either Rip.
    const scores = week([
      player({ name: "Alice", total: 5, pro: [pick("KC")] }),
      player({ name: "Rip", total: 5, pro: [pick("DEN")] }),
      player({ name: "Rip", total: 5, pro: [pick("DEN")] }),
      player({ name: "Bob", total: 4, pro: [pick("DEN")] }),
      player({
        name: "Dan",
        total: 4,
        pro: [pick("DEN")],
        isKnockedOut: true,
      }),
    ]);

    expect(getKnockouts(scores).games).toEqual([
      {
        label: "P1",
        name: "P1",
        isFinal: false,
        sides: [{ team: "DEN", pick: "DEN", players: ["Bob"] }],
      },
    ]);
  });

  it("names who each game of a decided week knocked out", () => {
    const scores = week(
      [
        player({ name: "Alice", total: 5, pro: [pick("KC -3", "yes")] }),
        player({
          name: "Bob",
          total: 4,
          pro: [pick("DEN +3", "no")],
          isKnockedOut: true,
        }),
      ],
      41,
    );

    expect(getKnockouts(scores)).toEqual({
      games: [
        {
          label: "P1",
          name: "P1",
          isFinal: true,
          sides: [{ team: "DEN", pick: "DEN +3", players: ["Bob"] }],
        },
      ],
    });
  });

  it("names who a won week's final games knocked out, and no open game", () => {
    // KC left Bob unable to pass Alice, which won her the week with P2 to come.
    const scores = week([
      player({
        name: "Alice",
        total: 5,
        pro: [pick("KC", "yes"), pick("SF")],
      }),
      player({
        name: "Bob",
        total: 3,
        pro: [pick("DEN", "no"), pick("LAR")],
        isKnockedOut: true,
      }),
    ]);

    expect(getKnockouts(scores).games).toEqual([
      {
        label: "P1",
        name: "P1",
        isFinal: true,
        sides: [{ team: "DEN", pick: "DEN", players: ["Bob"] }],
      },
    ]);
  });

  it("answers nothing for a week the knockouts leave to one player", () => {
    const scores = week([
      player({ name: "Alice", total: 5, pro: [pick("KC -3"), pick("SF")] }),
      player({
        name: "Bob",
        total: 1,
        pro: [pick("DEN +3"), pick("LAR")],
        isKnockedOut: true,
      }),
    ]);

    expect(getKnockouts(scores)).toEqual({ games: [] });
  });

  it("puts a spread written with and without a space on one side", () => {
    const scores = week([
      player({ name: "Carol", total: 6, pro: [pick("MIA +7")] }),
      player({ name: "Alice", total: 5, pro: [pick("BUF -7")] }),
      player({ name: "Bob", total: 5, pro: [pick("BUF-7")] }),
    ]);

    expect(getKnockouts(scores).games[0].sides).toEqual([
      { team: "BUF", pick: "BUF -7", players: ["Alice", "Bob"] },
      { team: "MIA", pick: "MIA +7", players: ["Carol"] },
    ]);
  });

  it("leaves out the open games nobody must win", () => {
    // P2 is picked one way by all, and P3 is Carol's alone to lose.
    const scores = week([
      player({
        name: "Carol",
        total: 6,
        pro: [pick("DEN +3"), pick("SF -1"), pick("NYJ +2")],
      }),
      player({
        name: "Alice",
        total: 5,
        pro: [pick("KC -3"), pick("SF -1"), pick("NYJ +2")],
      }),
    ]);

    expect(getKnockouts(scores).games.map((game) => game.label)).toEqual([
      "P1",
    ]);
  });

  it("keeps the games in column order, even where a later one knocks out more", () => {
    const scores = week([
      player({
        name: "Carol",
        total: 5,
        college: [pick("OSU")],
        pro: [pick("DEN"), pick("SF")],
      }),
      player({
        name: "Dan",
        total: 5,
        college: [pick("OSU")],
        pro: [pick("DEN"), pick("LAR")],
      }),
      player({
        name: "Alice",
        total: 4,
        college: [pick("OSU")],
        pro: [pick("KC"), pick("SF")],
      }),
      player({
        name: "Bob",
        total: 4,
        college: [pick("OSU")],
        pro: [pick("KC"), pick("SF")],
      }),
    ]);

    expect(getKnockouts(scores).games).toEqual([
      {
        label: "P1",
        name: "P1",
        isFinal: false,
        sides: [{ team: "KC", pick: "KC", players: ["Alice", "Bob"] }],
      },
      {
        label: "P2",
        name: "P2",
        isFinal: false,
        sides: [
          { team: "SF", pick: "SF", players: ["Carol", "Alice", "Bob"] },
          { team: "LAR", pick: "LAR", players: ["Dan"] },
        ],
      },
    ]);
  });

  it("names who a final game knocked out", () => {
    // Before P1 all three stood on 4. KC put Alice and Carol on 5, and Bob, level
    // with Alice on every game left, can no longer pass her.
    const scores = week([
      player({
        name: "Alice",
        total: 5,
        pro: [pick("KC", "yes"), pick("SF"), pick("MIA")],
      }),
      player({
        name: "Carol",
        total: 5,
        pro: [pick("KC", "yes"), pick("LAR"), pick("NYJ")],
      }),
      player({
        name: "Bob",
        total: 4,
        pro: [pick("DEN", "no"), pick("SF"), pick("MIA")],
        isKnockedOut: true,
      }),
    ]);

    expect(getKnockouts(scores).games[0]).toEqual({
      label: "P1",
      name: "P1",
      isFinal: true,
      sides: [{ team: "DEN", pick: "DEN", players: ["Bob"] }],
    });
  });

  it("puts everyone the MNF Points knocked out under one tier side, whatever their pick did", () => {
    // 2016 week 1, P14 DEN at KC, 41 points. All three end level on total, so the
    // MNF Points settle it whether the pick scored or not.
    const scores = settled(
      [
        player({
          name: "Rival",
          total: 5,
          pro: [pick("KC", "yes")],
          tiebreakerPick: 41,
          distance: 0,
        }),
        player({
          name: "Will Ferguson",
          total: 5,
          pro: [pick("KC", "yes")],
          tiebreakerPick: 43,
          distance: 2,
        }),
        player({
          name: "RunningBach",
          total: 5,
          pro: [pick("DEN", "no")],
          tiebreakerPick: 49,
          distance: 8,
        }),
      ],
      41,
    );

    expect(getKnockouts(scores).games).toEqual([
      {
        label: "P1",
        name: "P1",
        isFinal: true,
        sides: [],
        tiebreakers: [
          {
            tiebreaker: "mnfPoints",
            players: ["Will Ferguson", "RunningBach"],
          },
        ],
      },
    ]);
  });

  it("keeps a pick side for a player behind on total", () => {
    const scores = settled(
      [
        player({
          name: "Alice",
          total: 2,
          pro: [pick("KC", "yes")],
          tiebreakerPick: 40,
          distance: 1,
        }),
        player({
          name: "Bob",
          total: 1,
          pro: [pick("DEN", "no")],
          tiebreakerPick: 41,
          distance: 0,
        }),
      ],
      41,
    );

    expect(getKnockouts(scores).games).toEqual([
      expect.objectContaining({
        sides: [{ team: "DEN", pick: "DEN", players: ["Bob"] }],
      }),
    ]);
  });

  it("puts a player the College Score knocked out under its tier, not their pick", () => {
    // Level on total and MNF Points, Bob is a college game behind.
    const scores = settled(
      [
        player({
          name: "Alice",
          total: 1,
          collegeScore: 1,
          college: [pick("UGA", "yes")],
          pro: [pick("KC", "no")],
          tiebreakerPick: 40,
          distance: 1,
        }),
        player({
          name: "Bob",
          total: 1,
          college: [pick("BAMA", "no")],
          pro: [pick("DEN", "yes")],
          tiebreakerPick: 40,
          distance: 1,
        }),
      ],
      41,
    );

    expect(getKnockouts(scores).games[0]).toEqual(
      expect.objectContaining({
        sides: [],
        tiebreakers: [{ tiebreaker: "college", players: ["Bob"] }],
      }),
    );
  });

  it("puts a player the Pro Score ATS knocked out under its tier, whatever their pick did", () => {
    // Level on total, MNF Points, and college. Alice's DEN missed and Bob's KC
    // scored, but only Alice covered a spread, on SF.
    const scores = settled(
      [
        player({
          name: "Alice",
          total: 1,
          proAgainstTheSpread: 1,
          pro: [pick("DEN", "no"), pick("SF -3", "yes")],
          tiebreakerPick: 40,
          distance: 1,
        }),
        player({
          name: "Bob",
          total: 1,
          pro: [pick("KC", "yes"), pick("LAR +3", "no")],
          tiebreakerPick: 40,
          distance: 1,
        }),
      ],
      41,
    );

    expect(getKnockouts(scores).games).toEqual([
      expect.objectContaining({
        label: "P2",
        sides: [],
        tiebreakers: [{ tiebreaker: "proAgainstTheSpread", players: ["Bob"] }],
      }),
    ]);
  });

  it("credits a player two final games knocked out to the one that kicked off first", () => {
    // Bob, a point behind Alice, needed both P1 and P2. P2 kicked off first, and
    // once it was lost P1 could no longer knock him out.
    const scores = week([
      player({
        name: "Alice",
        total: 6,
        pro: [pick("KC", "yes"), pick("SF", "yes"), pick("MIA")],
      }),
      player({
        name: "Carol",
        total: 6,
        pro: [pick("KC", "yes"), pick("SF", "yes"), pick("NYJ")],
      }),
      player({
        name: "Bob",
        total: 3,
        pro: [pick("DEN", "no"), pick("LAR", "no"), pick("MIA")],
        isKnockedOut: true,
      }),
    ]);
    const kickedOffAt = (game: ReturnType<typeof finalGame>, at: string) => ({
      ...game,
      date: new Date(at),
    });
    scores.games = [
      {
        label: "P1",
        league: League.PRO,
        name: "KC at DEN",
        result: kickedOffAt(
          finalGame({ home: "DEN", away: "KC", homeScore: 10, awayScore: 20 }),
          "2024-10-06T20:25:00Z",
        ),
      },
      {
        label: "P2",
        league: League.PRO,
        name: "SF at LAR",
        result: kickedOffAt(
          finalGame({ home: "LAR", away: "SF", homeScore: 10, awayScore: 20 }),
          "2024-10-06T17:00:00Z",
        ),
      },
    ];

    expect(knockoutPicks(getKnockouts(scores), "Bob")).toEqual(["P2 LAR"]);
  });

  it("leaves out a game the search names only among the ways that tie on points", () => {
    // Alice's routes that need the total all hold P3, but P1 and P2 together win
    // her the week outright. So P3 is no must-win of hers, and Carol needs all three.
    const scores = week([
      player({
        name: "Bob",
        total: 1,
        proAgainstTheSpread: 3,
        pro: [pick("KC"), pick("KC"), pick("KC")],
        tiebreakerPick: 30,
      }),
      player({
        name: "Alice",
        total: 2,
        proAgainstTheSpread: 2,
        pro: [pick("DEN"), pick("DEN"), pick("DEN +3")],
        tiebreakerPick: 30,
      }),
      player({
        name: "Carol",
        total: 0,
        pro: [pick("KC"), pick("KC -3"), pick("DEN +3")],
        tiebreakerPick: 31,
      }),
    ]);
    const analysis = getPlayerAnalysis(scores, "Alice");
    expect(analysis?.kind === "paths" && analysis.outright).toBeTruthy();

    expect(getKnockouts(scores).games).toEqual([
      {
        label: "P1",
        name: "P1",
        isFinal: false,
        sides: [{ team: "KC", pick: "KC", players: ["Carol"] }],
      },
      {
        label: "P2",
        name: "P2",
        isFinal: false,
        sides: [{ team: "KC", pick: "KC -3", players: ["Carol"] }],
      },
      {
        label: "P3",
        name: "P3",
        isFinal: false,
        sides: [{ team: "DEN", pick: "DEN +3", players: ["Carol"] }],
      },
    ]);
  });
});

/** A fixed pseudo-random week, so a run can be compared with the one before. */
function generatedWeek(gameCount: number, seed: number) {
  let state = seed;
  const next = (bound: number) => {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    return (state >>> 16) % bound;
  };
  const players: Array<PlayerScore> = Array.from({ length: 6 }, (_, index) =>
    player({
      name: `Player ${index}`,
      total: next(3),
      tiebreakerPick: 30 + next(20),
      pro: Array.from({ length: gameCount }, (_unused, game) =>
        pick(next(2) === 0 ? `H${game} -3` : `A${game} +3`),
      ),
    }),
  );
  return week(players);
}

/** The labels and teams of an answer's must-win games, sorted. */
function mustWinPicks(analysis: PlayerAnalysis | undefined): Array<string> {
  if (analysis?.kind !== "paths" && analysis?.kind !== "headline") return [];
  return analysis.mustWin
    .map((game) => `${game.label} ${parsePick(game.pick).teamAbbreviation}`)
    .sort();
}

function knockoutPicks(knockouts: KnockoutGames, name: string): Array<string> {
  return knockouts.games
    .flatMap((game) =>
      game.sides
        .filter((side) => side.players.includes(name))
        .map((side) => `${game.label} ${side.team}`),
    )
    .sort();
}

describe("getKnockouts, against getPlayerAnalysis", () => {
  it.each([
    [5, 101],
    [6, 202],
  ])("names the must-win games of %i open games", (gameCount, seed) => {
    const scores = generatedWeek(gameCount, seed);
    const knockouts = getKnockouts(scores);
    let compared = 0;

    for (const { name } of scores.scores) {
      const analysis = getPlayerAnalysis(scores, name);
      // The one answer whose must-win games the check is not held to.
      if (analysis?.kind === "paths" && analysis.outright != null) continue;
      const expected = mustWinPicks(analysis);
      expect(knockoutPicks(knockouts, name)).toEqual(expected);
      compared += expected.length;
    }
    expect(compared).toBeGreaterThan(0);
  });

  it("names the must-win games above the search limit", () => {
    // Alice needs all three of P1 to P3 to pass Bob. The rest are picked alike.
    const alike = Array.from({ length: MAX_SEARCHED_GAMES - 2 }, () =>
      pick("SF"),
    );
    const scores = week([
      player({
        name: "Bob",
        total: 6,
        pro: [pick("KC"), pick("KC"), pick("KC"), ...alike],
      }),
      player({
        name: "Alice",
        total: 4,
        pro: [pick("DEN"), pick("DEN"), pick("DEN"), ...alike],
      }),
    ]);
    const knockouts = getKnockouts(scores);

    expect(getPlayerAnalysis(scores, "Alice")?.kind).toBe("headline");
    for (const name of ["Alice", "Bob"]) {
      expect(knockoutPicks(knockouts, name)).toEqual(
        mustWinPicks(getPlayerAnalysis(scores, name)),
      );
    }
    expect(knockoutPicks(knockouts, "Alice")).toEqual([
      "P1 DEN",
      "P2 DEN",
      "P3 DEN",
    ]);
  });
});
