import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  PickShares,
  PlayerAnalysis,
  VictoryRoute,
} from "../../types/PlayerAnalysis";
import { MAX_SEARCHED_GAMES } from "../../utils/scoring/getPlayerAnalysis";
import AnalysisSummary from "./AnalysisSummary";

/** Routes of one game each, all different, so only their number matters. */
function routesOf(count: number): Array<VictoryRoute> {
  return Array.from({ length: count }, (_, index) => ({
    games: [{ label: `P${index + 1}`, pick: `T${index + 1} -3` }],
    mondayNight: { kind: "notNeeded" as const },
  }));
}

/** Shares of one game each, most needed first, so only their number matters. */
function sharesOf(count: number): PickShares {
  return {
    routeCount: 20,
    games: Array.from({ length: count }, (_, index) => ({
      label: `P${index + 1}`,
      pick: `T${index + 1} -3`,
      routes: count - index,
    })),
  };
}

/** The share table's rows, as each one reads on screen. */
function shareRows(): Array<string> {
  return [...document.querySelectorAll(".analysis__shares tbody tr")].map(
    (row) => row.textContent ?? "",
  );
}

/** The heading a block opens with, whether or not `And` conjoins it. */
function blockHeading(title: string): HTMLElement {
  return screen.getByRole("heading", { name: new RegExp(`^(And )?${title}$`) });
}

/** The picks under a heading, as the chips read on screen. */
function under(title: string): Array<string> {
  return picksUnder(blockHeading(title));
}

/** The same, for one heading of several a page holds under the same name. */
function picksUnder(heading: HTMLElement): Array<string> {
  return within(heading.parentElement as HTMLElement)
    .getAllByRole("listitem")
    .map((item) => item.textContent ?? "");
}

/** Whether a block's heading carries the word that conjoins it to the one above. */
function isConjoined(title: string): boolean {
  return blockHeading(title).firstElementChild?.textContent === "And";
}

/** The tiebreaker lines, as each reads on screen, the `AND` on it included. */
function mnfLines(): Array<string> {
  return [...document.querySelectorAll(".analysis__route-mnf")].map(
    (line) => line.textContent ?? "",
  );
}

/** The notes under a block, as each reads on screen. */
function notes(): Array<string> {
  return [...document.querySelectorAll(".analysis__note")].map(
    (note) => note.textContent ?? "",
  );
}

/** The one tiebreaker range the cases below need: a week won at 45 or under. */
const RAK_BY_45 = { kind: "range" as const, max: 45 };

const base = {
  kind: "paths" as const,
  player: "Alice",
  mustWin: [],
};

describe("AnalysisSummary", () => {
  it("says nothing until a player is picked", () => {
    const { container } = render(<AnalysisSummary />);

    expect(container).toBeEmptyDOMElement();
  });

  it("refuses to answer for a name two players entered under", () => {
    render(<AnalysisSummary playerName="Rip" hasNameConflict />);

    expect(
      screen.getByText("There is more than one entry for player name Rip."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
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
      screen.getByText("No other player can surpass them."),
    ).toBeInTheDocument();
  });

  it("leaves a clinch that also ends the week to its one line", () => {
    render(
      <AnalysisSummary
        result={{ kind: "clinched", player: "Alice" }}
        weekNumber={12}
        shape={{ remaining: [], unscoreable: [], isEveryGameSettled: true }}
      />,
    );

    expect(screen.getByText("Alice has won week 12.")).toBeInTheDocument();
    // Nothing is still to be played, so saying it cannot be undone adds nothing.
    expect(
      screen.queryByText(/Nothing still to be played/),
    ).not.toBeInTheDocument();
  });

  it("says only when the paths arrive on a week too big to search", () => {
    const result: PlayerAnalysis = {
      kind: "headline",
      player: "Alice",
      mustWin: [],
    };
    render(<AnalysisSummary result={result} />);

    // A count of wins names no games, so it would read as a way through without
    // being one. Nothing is claimed where nothing can be worked out.
    expect(screen.queryByText(/remaining picks/)).not.toBeInTheDocument();
    expect(screen.queryByText(/MNF Points/)).not.toBeInTheDocument();
    const why = screen.getByText(
      `Detailed analysis is performed once ${MAX_SEARCHED_GAMES} games remain.`,
    );
    expect(why).toBe(
      document.querySelector(".analysis__body")?.lastElementChild,
    );
  });

  it("names the must-win games a week too big to search can prove", () => {
    const result: PlayerAnalysis = {
      kind: "headline",
      player: "Alice",
      mustWin: [{ label: "P3", pick: "KC -7" }],
    };
    render(<AnalysisSummary result={result} />);

    expect(under("Must win")).toEqual(["P3KC -7"]);
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
    expect(under("Any 2 of")).toEqual(["P2KC -3", "P9BUF +1", "P11SF -6"]);
  });

  it("conjoins every block a win needs, and opens on the first", () => {
    const result: PlayerAnalysis = {
      ...base,
      mustWin: [{ label: "C4", pick: "UGA -7" }],
      pool: { choose: 2, games: [{ label: "P2", pick: "KC -3" }] },
      mondayNight: RAK_BY_45,
    };
    render(<AnalysisSummary result={result} />);

    expect(isConjoined("Must win")).toBe(false);
    expect(isConjoined("Any 2 of")).toBe(true);
    expect(mnfLines()).toEqual(["AND MNF Points ≤ 45"]);
  });

  it("leaves a settled tiebreaker unconjoined, since it asks for nothing", () => {
    const result: PlayerAnalysis = {
      ...base,
      mustWin: [{ label: "C4", pick: "UGA -7" }],
      mondayNight: { kind: "settled" },
    };
    render(<AnalysisSummary result={result} />);

    expect(isConjoined("MNF Points")).toBe(false);
  });

  it("says what a block asks for where it opens the answer", () => {
    const result: PlayerAnalysis = {
      ...base,
      routes: routesOf(2),
    };
    render(<AnalysisSummary result={result} />);

    expect(blockHeading("Needs one of")).toBeInTheDocument();
  });

  it("leaves the word off a block a must-win block already holds", () => {
    const result: PlayerAnalysis = {
      ...base,
      mustWin: [{ label: "P1", pick: "KC -3" }],
      routes: routesOf(2),
    };
    render(<AnalysisSummary result={result} />);

    expect(blockHeading("One of")).toBeInTheDocument();
    expect(isConjoined("One of")).toBe(true);
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

  it("sets a bounded Monday night range as the block's whole line", () => {
    const result: PlayerAnalysis = {
      ...base,
      mustWin: [{ label: "P1", pick: "KC -3" }],
      mondayNight: { kind: "range", min: 38, max: 44 },
    };
    render(<AnalysisSummary result={result} />);

    // The line a route of its own takes, rather than a title over nothing.
    expect(mnfLines()).toEqual(["AND 38 ≤ MNF Points ≤ 44"]);
    expect(
      screen.queryByRole("heading", { name: /MNF Points/ }),
    ).not.toBeInTheDocument();
  });

  it("writes an open-ended range from the end it is bounded on", () => {
    const result: PlayerAnalysis = {
      ...base,
      mustWin: [{ label: "P1", pick: "KC -3" }],
      mondayNight: RAK_BY_45,
    };
    render(<AnalysisSummary result={result} />);

    expect(mnfLines()).toEqual(["AND MNF Points ≤ 45"]);
  });

  it("names the games that take the week without the tiebreaker at all", () => {
    const result: PlayerAnalysis = {
      ...base,
      pool: { choose: 2, games: [{ label: "P1", pick: "KC -3" }] },
      outright: {
        mustWin: [],
        pool: {
          choose: 3,
          games: [
            { label: "P1", pick: "KC -3" },
            { label: "P2", pick: "SF -6" },
          ],
        },
      },
      mondayNight: RAK_BY_45,
    };
    render(<AnalysisSummary result={result} />);

    const line = screen.getByText("To win outright:");
    // Its own pool, asking one more game than winning the week at all does.
    expect(blockHeading("Needs any 3 of")).toBeInTheDocument();
    expect(screen.getByText("SF -6")).toBeInTheDocument();

    // Over the ways that need a total, which the tiebreaker line hands down to.
    expect(
      line.compareDocumentPosition(blockHeading("Needs any 2 of")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      line.compareDocumentPosition(
        screen.getByText("To win with MNF Points tiebreaker:"),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("leads with taking the week outright, ahead of the games", () => {
    const result: PlayerAnalysis = {
      ...base,
      mustWin: [{ label: "P1", pick: "KC -3" }],
      mondayNight: { kind: "notNeeded" },
    };
    render(<AnalysisSummary result={result} />);

    const outright = screen.getByText("Alice can win the week outright.");
    const mustWin = screen.getByRole("heading", { name: "Must win" });
    expect(
      outright.compareDocumentPosition(mustWin) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("lifts the games both blocks need over the pair of them", () => {
    const result: PlayerAnalysis = {
      ...base,
      // P1 is needed either way. P5 is needed only by the ways that want a total.
      mustWin: [
        { label: "P1", pick: "KC -3" },
        { label: "P5", pick: "GB -2" },
      ],
      outright: {
        mustWin: [
          { label: "P1", pick: "KC -3" },
          { label: "P2", pick: "SF -6" },
        ],
      },
      mondayNight: RAK_BY_45,
    };
    render(<AnalysisSummary result={result} />);

    // One heading holds the game every way needs, above the line that splits them.
    const musts = screen.getAllByRole("heading", { name: /^(And )?Must win$/ });
    expect(musts).toHaveLength(3);
    expect(picksUnder(musts[0])).toEqual(["P1KC -3"]);
    expect(
      musts[0].compareDocumentPosition(screen.getByText("To win outright:")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Each block keeps only what it asks for past that game.
    expect(picksUnder(musts[1])).toEqual(["P2SF -6"]);
    expect(picksUnder(musts[2])).toEqual(["P5GB -2"]);
    expect(screen.getAllByText("KC -3")).toHaveLength(1);
  });

  it("leaves a lone block's must-win games where they are", () => {
    const result: PlayerAnalysis = {
      ...base,
      mustWin: [{ label: "P1", pick: "KC -3" }],
      mondayNight: RAK_BY_45,
    };
    render(<AnalysisSummary result={result} />);

    // Nothing to lift them over, so the one block names them itself.
    expect(
      screen.getAllByRole("heading", { name: /^(And )?Must win$/ }),
    ).toHaveLength(1);
    expect(under("Must win")).toEqual(["P1KC -3"]);
  });

  it("says nothing about winning where the total still decides it", () => {
    const result: PlayerAnalysis = {
      ...base,
      mustWin: [{ label: "P1", pick: "KC -3" }],
      mondayNight: RAK_BY_45,
    };
    render(<AnalysisSummary result={result} />);

    // The standing above and the blocks below say it between them, so the line
    // is drawn only for the one thing neither of them carries.
    expect(screen.queryByText(/can win the week/)).not.toBeInTheDocument();
    expect(blockHeading("Must win")).toBeInTheDocument();
  });

  it("marks each option of a pool the way a route is marked", () => {
    const result: PlayerAnalysis = {
      ...base,
      mustWin: [{ label: "P1", pick: "KC -3" }],
      pool: {
        choose: 2,
        games: [
          { label: "P2", pick: "BUF -1" },
          { label: "P3", pick: "SF -6" },
        ],
      },
    };
    render(<AnalysisSummary result={result} />);

    // The mark goes on the options themselves, so the chips carry it and the
    // must-win grid, which is one box rather than a set of them, does not.
    expect(
      [...document.querySelectorAll(".analysis__pool > .analysis__pick")].map(
        (pick) => pick.textContent,
      ),
    ).toEqual(["P2BUF -1", "P3SF -6"]);
    expect(
      document.querySelector(".analysis__must-win.analysis__pool"),
    ).toBeNull();
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
          mondayNight: { kind: "range", max: 32 },
        },
      ],
    };
    render(<AnalysisSummary result={result} />);

    // Read off the routes themselves, since each one holds a list of picks of
    // its own and reading every list item at once would flatten the two apart.
    const routes = [...document.querySelectorAll(".analysis__route")];
    expect(routes.map((route) => route.textContent)).toEqual([
      "P1KC -3",
      "P2BUF -1P3SF -6AND MNF Points ≤ 32",
    ]);
  });

  it("states a total every route shares once, not on each of them", () => {
    const shared = { kind: "range" as const, max: 32 };
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
    expect(mnfLines()).toEqual(["AND MNF Points ≤ 32"]);
  });

  it("holds three routes open and folds the rest behind a button", () => {
    const result: PlayerAnalysis = { ...base, routes: routesOf(6) };
    render(<AnalysisSummary result={result} />);

    expect(document.querySelectorAll(".analysis__route")).toHaveLength(3);
    expect(
      screen.getByRole("button", { name: "Show more" }),
    ).toBeInTheDocument();
  });

  it("shows the rest once the button is clicked", async () => {
    const result: PlayerAnalysis = { ...base, routes: routesOf(6) };
    render(<AnalysisSummary result={result} />);
    await userEvent.click(screen.getByRole("button"));

    expect(document.querySelectorAll(".analysis__route")).toHaveLength(6);
    expect(
      screen.getByRole("button", { name: "Show fewer" }),
    ).toBeInTheDocument();
  });

  it("leaves the button off where every route is already open", () => {
    const result: PlayerAnalysis = { ...base, routes: routesOf(3) };
    render(<AnalysisSummary result={result} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("names each game once against the routes needing it, under the total", () => {
    const result: PlayerAnalysis = { ...base, shares: sharesOf(3) };
    render(<AnalysisSummary result={result} />);

    expect(blockHeading("20 ways")).toBeInTheDocument();
    expect(shareRows()).toEqual(["P1T1 -315%", "P2T2 -310%", "P3T3 -35%"]);
  });

  it("holds five games open and folds the rest behind a button", async () => {
    const result: PlayerAnalysis = { ...base, shares: sharesOf(8) };
    render(<AnalysisSummary result={result} />);

    expect(shareRows()).toHaveLength(5);
    await userEvent.click(screen.getByRole("button", { name: "Show more" }));
    expect(shareRows()).toHaveLength(8);

    await userEvent.click(screen.getByRole("button", { name: "Show fewer" }));
    expect(shareRows()).toHaveLength(5);
  });

  it("leaves the button off where every game is already open", () => {
    const result: PlayerAnalysis = { ...base, shares: sharesOf(5) };
    render(<AnalysisSummary result={result} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("holds a share off both ends, which no game in the table is at", () => {
    // A game the block above would have named must-win at 100, and one no route
    // needs at 0. Rounding alone would print both.
    const result: PlayerAnalysis = {
      ...base,
      shares: {
        routeCount: 400,
        games: [
          { label: "P1", pick: "KC -3", routes: 399 },
          { label: "P2", pick: "BUF -1", routes: 1 },
        ],
      },
    };
    render(<AnalysisSummary result={result} />);

    expect(shareRows()).toEqual(["P1KC -399%", "P2BUF -11%"]);
  });

  it("counts the ways asking for a total where only some of them do", () => {
    const result: PlayerAnalysis = {
      ...base,
      shares: {
        ...sharesOf(2),
        mondayNight: {
          points: { kind: "range", max: 41 },
          routes: 8,
          isAlways: false,
        },
      },
    };
    render(<AnalysisSummary result={result} />);

    // The ways asking for something else are left to the count to imply.
    expect(notes()).toEqual(["8 ways need MNF Points ≤ 41."]);
    // Not every way is held to it, so it is not a condition on the table.
    expect(mnfLines()).toEqual([]);
  });

  it("counts one way asking for a total as one way", () => {
    const result: PlayerAnalysis = {
      ...base,
      shares: {
        ...sharesOf(2),
        mondayNight: {
          points: { kind: "range", max: 41 },
          routes: 1,
          isAlways: false,
        },
      },
    };
    render(<AnalysisSummary result={result} />);

    expect(notes()).toEqual(["1 way needs MNF Points ≤ 41."]);
  });

  it("says the total is always needed where every route asks a different one", () => {
    const result: PlayerAnalysis = {
      ...base,
      shares: {
        ...sharesOf(2),
        mondayNight: {
          points: { kind: "range", min: 20 },
          routes: 8,
          isAlways: true,
        },
      },
    };
    render(<AnalysisSummary result={result} />);

    // No way is held to this one, so the table takes no `AND` line.
    expect(mnfLines()).toEqual([]);
    expect(notes()).toEqual([
      "Every way needs the MNF Points tiebreaker. 8 ways need MNF Points ≥ 20.",
    ]);
  });

  it("leaves the total off the table where the block below states it", () => {
    const result: PlayerAnalysis = {
      ...base,
      shares: {
        ...sharesOf(2),
        mondayNight: {
          points: { kind: "range", max: 41 },
          routes: 8,
          isAlways: false,
        },
      },
      mondayNight: RAK_BY_45,
    };
    render(<AnalysisSummary result={result} />);

    expect(notes()).toEqual([]);
    expect(mnfLines()).toEqual(["AND MNF Points ≤ 45"]);
  });
});
