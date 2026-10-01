import { act, fireEvent, render, screen } from "@testing-library/react";
import { GameStatus, HomeAway } from "../../types/ESPN";
import { LeagueResult } from "../../types/LeagueResult";
import { League } from "../../types/League";
import { WeekGame } from "../../types/WeekGame";
import GameStatusSummary from "./GameStatusSummary";

const KICKOFF = new Date("2024-10-06T17:00:00Z");

function game(result?: LeagueResult, spread?: WeekGame["spread"]): WeekGame {
  return {
    label: "P1",
    league: League.PRO,
    name: result?.shortName ?? "KC / BUF",
    result,
    spread,
  };
}

function result(over: Partial<LeagueResult> = {}): LeagueResult {
  return {
    id: "401",
    name: "Kansas City Chiefs at Buffalo Bills",
    shortName: "KC @ BUF",
    date: KICKOFF,
    status: GameStatus.FINAL,
    detailMessage: "Final",
    isNeutralSite: false,
    home: {
      team: {
        name: "Buffalo Bills",
        abbreviation: "BUF",
        logoUrl: "https://espn.com/buf.png",
      },
      score: 30,
      record: "4-1",
      linescores: [7, 10, 3, 10],
    },
    away: {
      team: {
        name: "Kansas City Chiefs",
        abbreviation: "KC",
        logoUrl: "https://espn.com/kc.png",
      },
      score: 20,
      record: "3-2",
      linescores: [7, 3, 10, 0],
    },
    venue: "Orchard Park, NY",
    possession: {},
    winner: {
      team: { name: "Buffalo Bills", abbreviation: "BUF" },
      homeAway: HomeAway.HOME,
      by: 10,
    },
    totalScore: 50,
    ...over,
  };
}

/*
 * The scoreline and the teams' marks, neither of which any query reaches: a mark is
 * decorative beside the name it stands next to, and the scoreline is read whole rather
 * than a line at a time.
 */
function scoreline(): string | undefined {
  return document.querySelector(".game-status__scoreline")?.textContent;
}

function logos(): Array<string | null> {
  return [...document.querySelectorAll("img")].map((logo) =>
    logo.getAttribute("src"),
  );
}

describe("GameStatusSummary, the game it is given", () => {
  it("draws nothing with no game chosen", () => {
    const { container } = render(<GameStatusSummary />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the week's own copy of the game with nothing fetched yet", () => {
    render(<GameStatusSummary game={game(result())} />);
    // The game itself rather than a wait for it, marks and all.
    expect(
      litDigits(
        document.querySelector(
          ".game-status__score.--home .game-status__points",
        ) as Element,
      ),
    ).toEqual("30");
    expect(logos()).toHaveLength(2);
  });

  it("lays the week's own copy out as the answer that replaces it", () => {
    const week = result();
    const { unmount } = render(<GameStatusSummary game={game(week)} />);
    const before = scoreline();
    unmount();

    // The same lines, in the same places, so nothing under the dialog moves when
    // the answer lands on a game that has not moved either.
    render(<GameStatusSummary game={game(week)} result={week} />);
    expect(scoreline()).toEqual(before);
  });

  it("puts a fetched score up in place of the week's own", () => {
    const home = (): string =>
      litDigits(
        document.querySelector(
          ".game-status__score.--home .game-status__points",
        ) as Element,
      );
    const week = result({
      status: GameStatus.LIVE,
      home: { ...result().home, score: 7 },
    });
    const { rerender } = render(<GameStatusSummary game={game(week)} />);
    expect(home()).toEqual("7");

    // The same game, one poll later. The score moves and nothing else does.
    rerender(<GameStatusSummary game={game(week)} result={result()} />);
    expect(home()).toEqual("30");
  });

  it("shows the game without its marks rather than one that never loads", () => {
    render(<GameStatusSummary game={game(result())} result={result()} />);
    fireEvent.error(document.querySelectorAll("img")[0]);

    expect(document.querySelector(".game-status")).not.toBeNull();
    expect(logos()).toEqual([]);
  });

  it("counts down to kickoff under the scores, a minute at a time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(KICKOFF.getTime() - 2 * 60_000));
    try {
      const pregame = result({ status: GameStatus.UPCOMING });
      render(<GameStatusSummary game={game(pregame)} />);
      expect(screen.getByText("Kickoff in 2m")).toBeInTheDocument();

      await act(() => vi.advanceTimersByTimeAsync(60_000));
      expect(screen.getByText("Kickoff in 1m")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("counts down from now on a game moved to, not from when the summary mounted", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(KICKOFF.getTime() - 40 * 60_000));
    try {
      const live = result({ status: GameStatus.LIVE });
      const { rerender } = render(<GameStatusSummary game={game(live)} />);

      vi.setSystemTime(new Date(KICKOFF.getTime() - 10 * 60_000));
      const pregame = result({ id: "402", status: GameStatus.UPCOMING });
      rerender(<GameStatusSummary game={game(pregame)} />);
      expect(screen.getByText("Kickoff in 10m")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("says nothing under the scores for a kickoff ESPN sent nothing to parse", () => {
    const pregame = result({
      status: GameStatus.UPCOMING,
      date: new Date(Number.NaN),
    });
    render(<GameStatusSummary game={game(pregame)} />);
    expect(screen.queryByText(/Kickoff/)).toBeNull();
  });

  it("says so where ESPN listed no game for the column", () => {
    render(<GameStatusSummary game={game()} />);
    expect(screen.getByText(/No game was found for P1/)).toHaveTextContent(
      "KC / BUF",
    );
    expect(document.querySelector(".game-status")).toBeNull();
  });
});

describe("GameStatusSummary, the pool and the reader's pick", () => {
  const poolLine = () => screen.getByText(/^All Picks:/);

  it("gives each side the line it plays to", () => {
    render(
      <GameStatusSummary
        game={game(result(), { team: "BUF", points: -3.5 })}
        result={result()}
      />,
    );
    expect(poolLine()).toHaveTextContent("All Picks: KC +3.5, BUF -3.5");
  });

  it("names the sides alone where the picks put no line on the game", () => {
    render(<GameStatusSummary game={game(result())} result={result()} />);
    expect(poolLine()).toHaveTextContent("All Picks: KC, BUF");
  });

  it("says the reader's own pick beside the pool's, and marks the side it names", () => {
    render(
      <GameStatusSummary
        game={game(result(), { team: "BUF", points: -3 })}
        result={result()}
        myPick="kc +3"
      />,
    );
    expect(screen.getByText(/^Your Pick:/)).toHaveTextContent(
      "Your Pick: kc +3",
    );
    const inScoreline = document.querySelector(
      ".game-status__team-name.--picked",
    );
    expect(inScoreline).toHaveTextContent("KC");
    expect(inScoreline).toHaveTextContent("Your pick");
    expect(document.querySelectorAll(".--picked")).toHaveLength(1);
  });

  it("puts the reader's own pick ahead of the pool's", () => {
    render(
      <GameStatusSummary game={game(result())} result={result()} myPick="kc" />,
    );
    const lead = document.querySelector(".game-status__lead");
    expect(lead?.firstElementChild).toHaveTextContent(/^Your Pick:/);
    expect(lead?.lastElementChild).toHaveTextContent(/^All Picks:/);
  });

  it("says no pick and marks no side for a reader with no pick", () => {
    render(<GameStatusSummary game={game(result())} result={result()} />);
    expect(screen.queryByText(/^Your Pick:/)).toBeNull();
    expect(document.querySelector(".--picked")).toBeNull();
  });
});

describe("GameStatusSummary, what the pool made of a finished game", () => {
  const covered = (spread: WeekGame["spread"]) => {
    // Buffalo won by ten.
    render(
      <GameStatusSummary game={game(result(), spread)} result={result()} />,
    );
    return document.querySelector(".game-status__outcome")?.textContent;
  };

  it.each([
    [{ team: "BUF", points: -3 }, "BUF covered"],
    [{ team: "BUF", points: -14 }, "KC covered"],
    [{ team: "KC", points: -3 }, "BUF covered"],
  ])("names the side that covered for spread %O", (spread, expected) => {
    expect(covered(spread)).toBe(expected);
  });

  it("says a game that landed on the number scored for everybody", () => {
    expect(covered({ team: "BUF", points: -10 })).toBe("Push");
  });

  it("declares the winner where the picks carried no line", () => {
    expect(covered(undefined)).toBe("BUF won");
  });

  it("says a game that finished level scored for everybody", () => {
    const drawn = result({
      away: { ...result().away, score: 30 },
      winner: { team: null, homeAway: null, by: 0 },
    });
    render(<GameStatusSummary game={game(drawn)} result={drawn} />);
    expect(document.querySelector(".game-status__outcome")).toHaveTextContent(
      "Tied",
    );
  });
});

describe("GameStatusSummary, a game that is over", () => {
  const renderFinal = () =>
    render(<GameStatusSummary game={game(result())} result={result()} />);

  it("names both sides in full, with their records and which is home", () => {
    renderFinal();
    expect(screen.getByText("Kansas City Chiefs")).toBeInTheDocument();
    expect(screen.getByText("Buffalo Bills")).toBeInTheDocument();
    expect(screen.getByText("Away")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("3-2")).toBeInTheDocument();
    expect(screen.getByText("4-1")).toBeInTheDocument();
  });

  it("calls both sides a team where neither of them is hosting", () => {
    const bowl = result({ isNeutralSite: true });
    render(<GameStatusSummary game={game(bowl)} result={bowl} />);
    expect(screen.getAllByText("Team")).toHaveLength(2);
    expect(screen.queryByText("Home")).toBeNull();
    expect(screen.queryByText("Away")).toBeNull();
  });

  it("says Final, and nothing about how the quarters went", () => {
    renderFinal();
    expect(screen.getByText("Final")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("marks neither side, the ball being nobody's once the game is over", () => {
    renderFinal();
    expect(screen.queryByLabelText("Has the ball")).toBeNull();
  });

  it("carries each side's abbreviation, which is what a phone shows", () => {
    renderFinal();
    const short = [...document.querySelectorAll(".game-status__name-short")];
    expect(short.map((it) => it.textContent)).toEqual(["KC", "BUF"]);
    short.forEach((it) => expect(it).not.toHaveAttribute("aria-hidden"));
  });
});

/**
 * The digits the readout has lit, without the row of unlit cells laid under them.
 * The seven-segment face draws the score over its own dark segments, and that layer
 * is a text node's worth of eights in the same element.
 */
function litDigits(element: Element): string {
  return [...element.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join("");
}

describe("GameStatusSummary, which side took the point", () => {
  function marked(
    spread: WeekGame["spread"],
    over: Partial<LeagueResult> = {},
  ): { scored: Array<string>; missed: Array<string>; scores: Array<string> } {
    // Buffalo won by ten, at home.
    const played = result(over);
    render(<GameStatusSummary game={game(played, spread)} result={played} />);
    const textOf = (selector: string) =>
      [...document.querySelectorAll(selector)].map(
        (el) => el.textContent ?? "",
      );
    return {
      scored: textOf(
        ".game-status__team-name.--scored .game-status__name-short",
      ),
      missed: textOf(
        ".game-status__team-name.--missed .game-status__name-short",
      ),
      scores: [
        ...document.querySelectorAll(
          ".game-status__score.--scored .game-status__points",
        ),
      ].map(litDigits),
    };
  }

  it.each([
    [
      { team: "BUF", points: -3 },
      undefined,
      { scored: ["BUF"], missed: ["KC"], scores: ["30"] },
    ],
    [
      { team: "BUF", points: -14 },
      undefined,
      { scored: ["KC"], missed: ["BUF"] },
    ],
    [undefined, undefined, { scored: ["BUF"], missed: ["KC"] }],
    [
      { team: "BUF", points: -10 },
      undefined,
      { scored: ["KC", "BUF"], missed: [], scores: ["20", "30"] },
    ],
    [
      undefined,
      {
        away: { ...result().away, score: 30 },
        winner: { team: null, homeAway: null, by: 0 },
      },
      { scored: ["KC", "BUF"], missed: [] },
    ],
    [
      { team: "BUF", points: -3 },
      { status: GameStatus.LIVE, period: 2, clock: "8:42" },
      { scored: [], missed: [] },
    ],
  ])(
    "marks the sides based on game result and spread",
    (spread, overrides, expected) => {
      const result_ = overrides ? marked(spread, overrides) : marked(spread);
      expect(result_.scored).toEqual(expected.scored);
      expect(result_.missed).toEqual(expected.missed);
      if ("scores" in expected) {
        expect(result_.scores).toEqual(expected.scores);
      }
    },
  );
});

describe("GameStatusSummary, how the reader's pick and the pool's sides did", () => {
  // Buffalo won by ten, so with Buffalo giving three, Buffalo covered.
  function lead(myPick: string, over: Partial<LeagueResult> = {}) {
    const played = result(over);
    render(
      <GameStatusSummary
        game={game(played, { team: "BUF", points: -3 })}
        result={played}
        myPick={myPick}
        players={[]}
      />,
    );
    const pick = document.querySelector(
      ".game-status__my-pick .game-status__picks-team",
    );
    const pool = [
      ...document.querySelectorAll(
        ".game-status__picks .game-status__picks-team",
      ),
    ];
    const outcome = (el: Element | null) =>
      el?.classList.contains("--scored")
        ? "scored"
        : el?.classList.contains("--missed")
          ? "missed"
          : undefined;
    return { pick: outcome(pick), pool: pool.map(outcome) };
  }

  it("marks a pick on the side that covered as right", () => {
    expect(lead("BUF -3")).toEqual({
      pick: "scored",
      pool: ["missed", "scored"],
    });
  });

  it("marks a pick on the side that did not cover as wrong", () => {
    expect(lead("kc +3").pick).toBe("missed");
  });

  it("marks neither while the game is still being played", () => {
    expect(
      lead("BUF -3", { status: GameStatus.LIVE, period: 2, clock: "8:42" }),
    ).toEqual({ pick: undefined, pool: [undefined, undefined] });
  });
});

/*
 * `TZ` is what `toLocaleDateString` reads the zone from, and Node picks a change to it
 * up on the next call. Set here so the kickoff asserted is the same wherever the suite
 * is run, which the developers' machines and CI do not agree on.
 */
describe("GameStatusSummary, the kickoff", () => {
  const zone = process.env.TZ;
  afterEach(() => {
    process.env.TZ = zone;
  });

  function kickoff(timeZone: string): Array<string | null> {
    process.env.TZ = timeZone;
    render(<GameStatusSummary game={game(result())} result={result()} />);
    return [
      ...document.querySelectorAll(".game-status__meta-group:first-child span"),
    ].map((part) => part.textContent);
  }

  it("says the day, the year and the time in the reader's own zone, and names it", () => {
    // 17:00 UTC, which is the morning where this reader is.
    expect(kickoff("America/Los_Angeles")).toEqual([
      "Sun, Oct 6, 2024",
      "10:00 AM PDT",
    ]);
  });

  it("moves the day with the zone, not only the time", () => {
    // The same instant, on which this reader is already into Monday.
    expect(kickoff("Australia/Sydney")).toEqual([
      "Mon, Oct 7, 2024",
      "4:00 AM GMT+11",
    ]);
  });
});

describe("GameStatusSummary, a team with no mark", () => {
  it("drops both marks where either team has none", () => {
    const oneLogo = result({
      away: {
        team: { name: "Kansas City Chiefs", abbreviation: "KC" },
        score: 20,
        record: "3-2",
        linescores: [7, 3, 10, 0],
      },
    });
    render(<GameStatusSummary game={game(oneLogo)} result={oneLogo} />);
    expect(logos()).toEqual([]);
  });

  it("drops both marks where one of them fails to load", () => {
    render(<GameStatusSummary game={game(result())} result={result()} />);
    fireEvent.error(document.querySelectorAll("img")[0]);
    expect(logos()).toEqual([]);
  });
});

describe("GameStatusSummary, a game still being played", () => {
  const live = result({
    status: GameStatus.LIVE,
    detailMessage: "8:42 - 3rd Quarter",
    period: 3,
    clock: "8:42",
    possession: { homeAway: HomeAway.AWAY, downDistanceText: "2nd & 7" },
    winner: { team: null, homeAway: null, by: 10 },
  });

  const renderLive = () =>
    render(<GameStatusSummary game={game(live)} result={live} />);

  it("shows the clock, the quarter, and the down", () => {
    renderLive();
    expect(screen.getByText("Q3 8:42")).toBeInTheDocument();
    expect(screen.queryByText("8:42 - 3rd Quarter")).toBeNull();
    expect(screen.getByText("2nd & 7")).toBeInTheDocument();
  });

  it("sends a reader on to ESPN's own page for the game", () => {
    renderLive();
    expect(screen.getByRole("link", { name: "Gamecast" })).toHaveAttribute(
      "href",
      "https://www.espn.com/nfl/game/_/gameId/401",
    );
  });

  it("sends a college reader to the college section of the same site", () => {
    // The league names itself in the path, so the two land on different sections
    // rather than both on the one the pro games use.
    render(
      <GameStatusSummary
        game={{ ...game(live), league: League.COLLEGE }}
        result={live}
      />,
    );
    expect(screen.getByRole("link", { name: "Gamecast" })).toHaveAttribute(
      "href",
      "https://www.espn.com/college-football/game/_/gameId/401",
    );
  });

  it("holds the down's line with a word where there is no down to say", () => {
    const dead = { ...live, possession: { homeAway: HomeAway.AWAY } };
    render(<GameStatusSummary game={game(dead)} result={dead} />);
    // A line either way, so the poll that finds no down cannot move the scoreline.
    expect(screen.getByText("Between plays")).toBeInTheDocument();
  });

  it("drops the last down at the half, where no side has the ball", () => {
    // ESPN leaves the down that ended the half standing, with the side that ran it
    // cleared. Nobody is facing it, so the line says the break instead.
    const half = {
      ...live,
      period: 2,
      clock: "0:00",
      possession: { downDistanceText: "2nd & 11 at TEX 17" },
    };
    render(<GameStatusSummary game={game(half)} result={half} />);
    expect(screen.getByText("Halftime")).toBeInTheDocument();
    expect(screen.queryByText("2nd & 11 at TEX 17")).toBeNull();
    expect(screen.getByText("Between plays")).toBeInTheDocument();
  });

  it("says who has the ball with the marker alone", () => {
    renderLive();
    expect(screen.getByLabelText("Has the ball")).toBeInTheDocument();
    expect(screen.queryByText("KC ball")).toBeNull();
  });

  it("draws the side without the ball a marker of its own, unlit", () => {
    renderLive();
    expect(document.querySelectorAll(".game-status__marker")).toHaveLength(2);
    expect(
      document.querySelectorAll('.game-status__marker[aria-hidden="true"]'),
    ).toHaveLength(1);
  });
});

describe("GameStatusSummary, a game yet to kick off", () => {
  it("says it is yet to start, leaving the kickoff to the strip above", () => {
    const upcoming = result({
      status: GameStatus.UPCOMING,
      detailMessage: "Sun, October 6th - 1:00 PM EDT",
      home: {
        team: { name: "Buffalo Bills", abbreviation: "BUF" },
        score: 0,
        linescores: [],
      },
      away: {
        team: { name: "Kansas City Chiefs", abbreviation: "KC" },
        score: 0,
        linescores: [],
      },
      winner: { team: null, homeAway: null, by: 0 },
    });
    render(<GameStatusSummary game={game(upcoming)} result={upcoming} />);
    expect(screen.getByText("Pregame")).toBeInTheDocument();
    // ESPN says a scheduled game as its kickoff, in Eastern time. Shown here it
    // would be the strip above said twice, and said in the wrong zone.
    expect(screen.queryByText("Sun, October 6th - 1:00 PM EDT")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByLabelText("Has the ball")).toBeNull();
  });

  it("keeps ESPN's word for a stage it has no short form for", () => {
    const postponed = result({
      // Neither of the three the app knows, which is how ESPN says a game called off.
      status: "5" as GameStatus,
      detailMessage: "Postponed",
      home: {
        team: { name: "Buffalo Bills", abbreviation: "BUF" },
        score: 0,
        linescores: [],
      },
      away: {
        team: { name: "Kansas City Chiefs", abbreviation: "KC" },
        score: 0,
        linescores: [],
      },
    });
    render(<GameStatusSummary game={game(postponed)} result={postponed} />);
    expect(screen.getByText("Postponed")).toBeInTheDocument();
  });

  it("says a game that needed overtime went to it", () => {
    const overtime = result({
      detailMessage: "Final/OT",
      home: {
        team: { name: "Buffalo Bills", abbreviation: "BUF" },
        score: 36,
        // Five periods, which is the only thing the quarters are still read for.
        linescores: [7, 10, 3, 10, 6],
      },
      away: {
        team: { name: "Kansas City Chiefs", abbreviation: "KC" },
        score: 30,
        linescores: [7, 3, 10, 10, 0],
      },
    });
    render(<GameStatusSummary game={game(overtime)} result={overtime} />);
    expect(screen.getByText("Final/OT")).toBeInTheDocument();
  });
});
