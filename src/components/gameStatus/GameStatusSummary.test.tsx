import { fireEvent, render, screen } from "@testing-library/react";
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
    loser: {
      team: { name: "Kansas City Chiefs", abbreviation: "KC" },
      homeAway: HomeAway.AWAY,
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

  it("says so where ESPN listed no game for the column", () => {
    render(<GameStatusSummary game={game()} />);
    expect(screen.getByText(/No game was found for P1/)).toHaveTextContent(
      "KC / BUF",
    );
    expect(document.querySelector(".game-status")).toBeNull();
  });
});

describe("GameStatusSummary, the pool's line on the game", () => {
  // The label and the line are two elements, since the line alone is set in the
  // table's face, so the sentence is read off the paragraph holding both.
  const spreadLine = () => screen.getByText(/Rak Madness Spread/);

  it("names the favored side and what it gives", () => {
    render(
      <GameStatusSummary
        game={game(result(), { team: "BUF", points: -3 })}
        result={result()}
      />,
    );
    expect(spreadLine()).toHaveTextContent("Rak Madness Spread: BUF -3");
  });

  it("says so where the picks put no line on the game", () => {
    render(<GameStatusSummary game={game(result())} result={result()} />);
    // Said either way, so a game with no line is not one the dialog forgot about.
    expect(spreadLine()).toHaveTextContent("Rak Madness Spread: NONE");
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

  it("names the side that covered", () => {
    expect(covered({ team: "BUF", points: -3 })).toBe("BUF covered");
  });

  it("names the underdog where the favorite won by less than it gave", () => {
    expect(covered({ team: "BUF", points: -14 })).toBe("KC covered");
  });

  it("names the underdog where the favorite lost outright", () => {
    expect(covered({ team: "KC", points: -3 })).toBe("BUF covered");
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
      loser: { team: null, homeAway: null, by: 0 },
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
    // One word each, which is what keeps the label off a second line on a phone.
    expect(screen.getAllByText("Team")).toHaveLength(2);
    expect(screen.queryByText("Home")).toBeNull();
    expect(screen.queryByText("Away")).toBeNull();
  });

  it("ends the strip with where it was played and the link out, in that order", () => {
    renderFinal();
    // Each part on its own, since a dot between two of them is the stylesheet's.
    expect(
      [
        ...document.querySelectorAll(
          ".game-status__meta-group:last-child span",
        ),
      ].map((part) => part.textContent),
    ).toEqual(["Orchard Park, NY", "Gamecast"]);
  });

  it("says FT/OT, and nothing about how the quarters went", () => {
    renderFinal();
    expect(screen.getByText("FT")).toBeInTheDocument();
    // The pool is scored on the result, so a quarter's points are nobody's business.
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("marks neither side, the ball being nobody's once the game is over", () => {
    renderFinal();
    expect(screen.queryByLabelText("Has the ball")).toBeNull();
  });

  it("joins the two scores at a dash, and leaves the down out with none to say", () => {
    renderFinal();
    expect(document.querySelectorAll(".game-status__dash")).toHaveLength(1);
    expect(document.querySelector(".game-status__down")).toBeNull();
  });

  it("stands the away side on the left, the way the search names the game", () => {
    renderFinal();
    expect(
      [...document.querySelectorAll(".game-status__side")].map(
        (side) => side.className,
      ),
    ).toEqual(["game-status__side --away", "game-status__side --home"]);
  });

  it("carries each side's abbreviation, which is what a phone shows", () => {
    renderFinal();
    const short = [...document.querySelectorAll(".game-status__name-short")];
    expect(short.map((it) => it.textContent)).toEqual(["KC", "BUF"]);
    // Neither form is hidden from a reader by hand. The stylesheet draws one and
    // sets the other `display: none`, which takes it out of the accessibility tree
    // as well, so whichever is on screen is the one and only one read out. Hidden
    // here, the side would have no name at all at the widths showing this form.
    short.forEach((it) => expect(it).not.toHaveAttribute("aria-hidden"));
  });

  it("wears both teams' marks, away first", () => {
    renderFinal();
    expect(logos()).toEqual([
      "https://espn.com/kc.png",
      "https://espn.com/buf.png",
    ]);
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

describe("GameStatusSummary, the two scores as a pair", () => {
  function points(scores: { home: number; away: number }): Array<string> {
    const scored = result({
      home: { ...result().home, score: scores.home },
      away: { ...result().away, score: scores.away },
    });
    render(<GameStatusSummary game={game(scored)} result={scored} />);
    return [...document.querySelectorAll(".game-status__points")].map(
      litDigits,
    );
  }

  /** The row of unlit cells laid under one side's digits. */
  function cells(scores: { home: number; away: number }): Array<string> {
    points(scores);
    return [...document.querySelectorAll(".game-status__points-ghost")].map(
      (ghost) => ghost.textContent ?? "",
    );
  }

  it("lights the digits a score has and no leading zero", () => {
    expect(points({ home: 7, away: 14 })).toEqual(["14", "7"]);
  });

  it("does the same whichever side is the short one", () => {
    expect(points({ home: 21, away: 3 })).toEqual(["3", "21"]);
  });

  it("leaves two double figures alone", () => {
    expect(points({ home: 30, away: 20 })).toEqual(["20", "30"]);
  });

  it("holds both cells regardless of the score", () => {
    expect(cells({ home: 3, away: 7 })).toEqual(["88", "88"]);
  });
});

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

  it("marks the side that covered, and the other side against it", () => {
    expect(marked({ team: "BUF", points: -3 })).toEqual({
      scored: ["BUF"],
      missed: ["KC"],
      scores: ["30"],
    });
  });

  it("marks the underdog where the favorite won by less than it gave", () => {
    const { scored, missed } = marked({ team: "BUF", points: -14 });
    expect(scored).toEqual(["KC"]);
    expect(missed).toEqual(["BUF"]);
  });

  it("marks the outright winner where the picks carried no line", () => {
    // The point still goes to whoever picked the winner, so the game says who that is.
    const { scored, missed } = marked(undefined);
    expect(scored).toEqual(["BUF"]);
    expect(missed).toEqual(["KC"]);
  });

  // A push and a tie with no line are a point for everybody, so every pick was on a
  // side that scored and neither side is marked against.
  it("marks both sides on a game that landed on the number", () => {
    expect(marked({ team: "BUF", points: -10 })).toEqual({
      scored: ["KC", "BUF"],
      missed: [],
      scores: ["20", "30"],
    });
  });

  it("marks both sides on a game that finished level", () => {
    const drawn = {
      away: { ...result().away, score: 30 },
      winner: { team: null, homeAway: null, by: 0 },
      loser: { team: null, homeAway: null, by: 0 },
    };
    const { scored, missed } = marked(undefined, drawn);
    expect(scored).toEqual(["KC", "BUF"]);
    expect(missed).toEqual([]);
  });

  it("marks neither side while the game is still being played", () => {
    // A side ahead at half time has won nothing yet.
    const { scored, missed } = marked(
      { team: "BUF", points: -3 },
      { status: GameStatus.LIVE, period: 2, clock: "8:42" },
    );
    expect(scored).toEqual([]);
    expect(missed).toEqual([]);
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
    loser: { team: null, homeAway: null, by: 10 },
  });

  const renderLive = () =>
    render(<GameStatusSummary game={game(live)} result={live} />);

  it("shows the clock, the quarter, and the down", () => {
    renderLive();
    // The quarter as `Q3` on every screen, rather than ESPN's own longer wording.
    expect(screen.getByText("Q3 8:42")).toBeInTheDocument();
    expect(screen.queryByText("8:42 - 3rd Quarter")).toBeNull();
    expect(screen.getByText("2nd & 7")).toBeInTheDocument();
  });

  it("stacks the status over the two scores and the down under them", () => {
    renderLive();
    // One block between the two sides, so both lines are read against the numbers
    // rather than against the dialog's edges.
    expect(
      [...document.querySelectorAll(".game-status__scoreline > *")].map(
        (it) => it.className,
      ),
    ).toEqual([
      "game-status__side --away",
      "game-status__center",
      "game-status__side --home",
    ]);
    expect(
      [...document.querySelectorAll(".game-status__center > *")].map(
        (it) => it.className,
      ),
    ).toEqual([
      "game-status__detail",
      "game-status__scores",
      "game-status__down",
    ]);
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
      loser: { team: null, homeAway: null, by: 0 },
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
    expect(screen.getByText("FT/OT")).toBeInTheDocument();
  });
});
