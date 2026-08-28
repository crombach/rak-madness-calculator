import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayerAnalysis, VictoryRoute } from "../../types/PlayerAnalysis";
import AnalysisSummary from "./AnalysisSummary";

/** Routes of one game each, all different, so only their number matters. */
function routesOf(count: number): Array<VictoryRoute> {
  return Array.from({ length: count }, (_, index) => ({
    games: [{ label: `P${index + 1}`, pick: `T${index + 1} -3` }],
    mondayNight: { kind: "notNeeded" as const },
  }));
}

/** The picks under a heading, as the chips read on screen. */
function under(title: string): Array<string> {
  const heading = screen.getByRole("heading", { name: title });
  return within(heading.parentElement as HTMLElement)
    .getAllByRole("listitem")
    .map((item) => item.textContent ?? "");
}

/** The one tiebreaker range the cases below need: beat Rak on 45 points. */
const RAK_BY_45 = {
  kind: "range" as const,
  max: 45,
  rivals: ["Rak"],
};

const base = {
  kind: "paths" as const,
  player: "Alice",
  mustWin: [],
  hiddenRouteCount: 0,
  needsHelp: [],
};

describe("AnalysisSummary", () => {
  it("says nothing until a player is picked", () => {
    const { container } = render(<AnalysisSummary />);

    expect(container).toBeEmptyDOMElement();
  });

  it("gives a knocked out player the reason they carry", () => {
    const result: PlayerAnalysis = {
      kind: "knockedOut",
      player: "Bob",
      explanation: "Knocked out on Total Score by Alice.",
    };
    render(<AnalysisSummary result={result} />);

    // The reason says they cannot win, so nothing above it says so again.
    expect(
      screen.getByText("Knocked out on Total Score by Alice."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Bob cannot win this week.")).toBeNull();
  });

  it("tells a knocked out player carrying no reason that they cannot win", () => {
    const result: PlayerAnalysis = { kind: "knockedOut", player: "Bob" };
    render(<AnalysisSummary result={result} />);

    expect(screen.getByText("Bob cannot win this week.")).toBeInTheDocument();
  });

  it("says nothing left can undo a clinch with games still to play", () => {
    render(
      <AnalysisSummary
        result={{ kind: "clinched", player: "Alice" }}
        weekNumber={12}
      />,
    );

    // The header calls Alice the winner without naming the week, so this does.
    expect(screen.getByText("Alice has won week 12.")).toBeInTheDocument();
    expect(
      screen.getByText("Nothing still to be played can take it away."),
    ).toBeInTheDocument();
  });

  it("leaves a clinch that also ends the week to its one line", () => {
    render(
      <AnalysisSummary
        result={{ kind: "clinched", player: "Alice" }}
        weekNumber={12}
        shape={{ remaining: [], unscoreable: [], isOver: true }}
      />,
    );

    expect(screen.getByText("Alice has won week 12.")).toBeInTheDocument();
    // Nothing is still to be played, so saying it cannot be undone adds nothing.
    expect(
      screen.queryByText(/Nothing still to be played/),
    ).not.toBeInTheDocument();
  });

  it("gives a floor rather than paths on a week too big to search", () => {
    const result: PlayerAnalysis = {
      kind: "headline",
      player: "Alice",
      remainingPickCount: 13,
      minimumWins: 6,
      needsMondayNight: true,
    };
    render(<AnalysisSummary result={result} />);

    expect(
      screen.getByText("Alice needs at least 6 of their 13 remaining picks."),
    ).toBeInTheDocument();
    expect(screen.getByText(/MNF Points tiebreaker/)).toBeInTheDocument();
    const why = screen.getByText(
      "Detailed paths are worked out once ten games are left.",
    );
    expect(why).toBe(
      document.querySelector(".analysis__body")?.lastElementChild,
    );
  });

  it("lists the must-win games and the pool behind them", () => {
    const result: PlayerAnalysis = {
      ...base,
      mustWin: [{ label: "C4", pick: "UGA -7" }],
      pool: {
        choose: 2,
        games: [
          { label: "P2", pick: "KC -3" },
          { label: "P9", pick: "BUF +1" },
          { label: "P11", pick: "SF -6" },
        ],
      },
      mondayNight: { kind: "notNeeded" },
    };
    render(<AnalysisSummary result={result} />);

    expect(under("Must win")).toEqual(["C4UGA -7"]);
    expect(under("Then any 2 of these")).toEqual([
      "P2KC -3",
      "P9BUF +1",
      "P11SF -6",
    ]);
  });

  it("says something for a player the games can no longer separate", () => {
    const result: PlayerAnalysis = {
      ...base,
      mondayNight: RAK_BY_45,
    };
    render(<AnalysisSummary result={result} />);

    expect(
      screen.getByText(
        "No clean path to victory. The MNF Points tiebreaker decides it.",
      ),
    ).toBeInTheDocument();
  });

  it("writes a bounded Monday night range as a sentence", () => {
    const result: PlayerAnalysis = {
      ...base,
      mustWin: [{ label: "P1", pick: "KC -3" }],
      mondayNight: {
        kind: "range",
        min: 38,
        max: 44,
        rivals: ["Rak", "Bill"],
      },
    };
    render(<AnalysisSummary result={result} />);

    expect(
      screen.getByText("38 ≤ MNF Points ≤ 44 to beat Rak and Bill."),
    ).toBeInTheDocument();
  });

  it("writes an open-ended range from the end it is bounded on", () => {
    const result: PlayerAnalysis = {
      ...base,
      mustWin: [{ label: "P1", pick: "KC -3" }],
      mondayNight: RAK_BY_45,
    };
    render(<AnalysisSummary result={result} />);

    expect(
      screen.getByText("MNF Points ≤ 45 to beat Rak."),
    ).toBeInTheDocument();
  });

  it("says what it takes to win without the tiebreaker at all", () => {
    const result: PlayerAnalysis = {
      ...base,
      pool: { choose: 2, games: [{ label: "P1", pick: "KC -3" }] },
      outrightAt: 3,
      mondayNight: RAK_BY_45,
    };
    render(<AnalysisSummary result={result} />);

    expect(
      screen.getByText("Winning 3 games takes it outright. Otherwise:"),
    ).toBeInTheDocument();
  });

  it("leads with taking the week outright, ahead of the games", () => {
    const result: PlayerAnalysis = {
      ...base,
      mustWin: [{ label: "P1", pick: "KC -3" }],
      mondayNight: { kind: "notNeeded" },
    };
    render(<AnalysisSummary result={result} />);

    const outright = screen.getByText(/Takes the week outright/);
    const mustWin = screen.getByRole("heading", { name: "Must win" });
    expect(
      outright.compareDocumentPosition(mustWin) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("leaves the outright line off where it asks no more than the routes do", () => {
    const result: PlayerAnalysis = {
      ...base,
      mustWin: [{ label: "P1", pick: "KC -3" }],
      outrightAt: 1,
      mondayNight: { kind: "notNeeded" },
    };
    render(<AnalysisSummary result={result} />);

    expect(screen.queryByText(/takes it outright/)).not.toBeInTheDocument();
  });

  it("names the player standing where nothing takes the week outright", () => {
    const result: PlayerAnalysis = {
      ...base,
      mustWin: [{ label: "P1", pick: "KC -3" }],
      mondayNight: RAK_BY_45,
    };
    render(<AnalysisSummary result={result} />);

    expect(
      screen.getByText("Alice is still live to win the week. What it takes:"),
    ).toBeInTheDocument();
  });

  it("names the team that has to miss in a game the player left blank", () => {
    const result: PlayerAnalysis = {
      ...base,
      mustWin: [{ label: "P1", pick: "KC -3" }],
      needsHelp: [{ label: "P7", needsToMiss: ["DEN"] }],
      mondayNight: { kind: "notNeeded" },
    };
    render(<AnalysisSummary result={result} />);

    expect(
      screen.getByText(/is blank on your sheet, so DEN has to miss/),
    ).toBeInTheDocument();
  });

  it("lists routes of different shapes with the ones that need a total marked", () => {
    const result: PlayerAnalysis = {
      ...base,
      routes: [
        {
          games: [{ label: "P1", pick: "KC -3" }],
          mondayNight: { kind: "notNeeded" },
        },
        {
          games: [
            { label: "P2", pick: "BUF -1" },
            { label: "P3", pick: "SF -6" },
          ],
          mondayNight: { kind: "range", max: 32, rivals: ["Rak"] },
        },
      ],
    };
    render(<AnalysisSummary result={result} />);

    // Read off the routes themselves, since each one holds a list of picks of
    // its own and reading every list item at once would flatten the two apart.
    const routes = [...document.querySelectorAll(".analysis__route")];
    expect(routes.map((route) => route.textContent)).toEqual([
      "P1KC -3",
      "P2BUF -1P3SF -6ANDMNF Points ≤ 32TO BEAT Rak",
    ]);
  });

  it("counts the routes left off under the last one, once they are all open", async () => {
    const result: PlayerAnalysis = {
      ...base,
      routes: routesOf(8),
      hiddenRouteCount: 2,
    };
    render(<AnalysisSummary result={result} />);

    const note = "2 other paths found but not shown.";
    expect(screen.queryByText(note)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button"));

    const routes = [...document.querySelectorAll(".analysis__route")];
    expect(screen.getByText(note).previousElementSibling).toBe(
      routes[routes.length - 1]?.parentElement,
    );
  });

  it("counts them straight away where no route was folded away", () => {
    const result: PlayerAnalysis = {
      ...base,
      routes: routesOf(2),
      hiddenRouteCount: 2,
    };
    render(<AnalysisSummary result={result} />);

    expect(
      screen.getByText("2 other paths found but not shown."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("names every player a route's total has to beat", () => {
    const result: PlayerAnalysis = {
      ...base,
      routes: [
        {
          games: [{ label: "P1", pick: "KC -3" }],
          mondayNight: { kind: "range", min: 30, rivals: ["Rak", "Bill"] },
        },
      ],
    };
    render(<AnalysisSummary result={result} />);

    expect(document.querySelector(".analysis__route")?.textContent).toBe(
      "P1KC -3ANDMNF Points ≥ 30TO BEAT Rak, Bill",
    );
  });

  it("states a total every route shares once, not on each of them", () => {
    const shared = { kind: "range" as const, max: 32, rivals: ["Rak"] };
    const result: PlayerAnalysis = {
      ...base,
      routes: [
        { games: [{ label: "P1", pick: "KC -3" }], mondayNight: shared },
        { games: [{ label: "P2", pick: "BUF -1" }], mondayNight: shared },
      ],
      mondayNight: shared,
    };
    render(<AnalysisSummary result={result} />);

    const routes = [...document.querySelectorAll(".analysis__route")];
    expect(routes.map((route) => route.textContent)).toEqual([
      "P1KC -3",
      "P2BUF -1",
    ]);
    expect(
      screen.getByText("MNF Points ≤ 32 to beat Rak."),
    ).toBeInTheDocument();
  });

  it("holds four routes open and folds the rest behind a button", () => {
    const result: PlayerAnalysis = { ...base, routes: routesOf(8) };
    render(<AnalysisSummary result={result} />);

    expect(document.querySelectorAll(".analysis__route")).toHaveLength(4);
    expect(
      screen.getByRole("button", { name: "Show 4 more paths" }),
    ).toBeInTheDocument();
  });

  it("shows the rest once the button is clicked", async () => {
    const result: PlayerAnalysis = { ...base, routes: routesOf(8) };
    render(<AnalysisSummary result={result} />);
    await userEvent.click(screen.getByRole("button"));

    expect(document.querySelectorAll(".analysis__route")).toHaveLength(8);
    expect(
      screen.getByRole("button", { name: "Show fewer" }),
    ).toBeInTheDocument();
  });

  it("leaves the button off where every route is already open", () => {
    const result: PlayerAnalysis = { ...base, routes: routesOf(4) };
    render(<AnalysisSummary result={result} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
