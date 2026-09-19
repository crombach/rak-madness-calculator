import { Mock } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import {
  PickResult,
  PlayerScore,
  RakMadnessScores,
  Status,
} from "../../../types/RakMadnessScores";
import { League } from "../../../types/League";
import { LeagueResult } from "../../../types/LeagueResult";
import { WeekGame } from "../../../types/WeekGame";
import { MISSING_PICK } from "../../../utils/scoring/getPickResults";
import { useScoreChanges } from "../../../context/AppDataContext";
import { GameStatusContextProvider } from "../../../context/GameStatusContext";
import {
  PLAYER_NAME_KEY,
  SettingsContextProvider,
} from "../../../context/SettingsContext";
import {
  delayedGame,
  finalGame,
  liveGame,
  upcomingGame,
} from "../../../utils/scoring/leagueResultFixtures";
import { pickChangeKey } from "../../../utils/scoring/gameColumns";
import { playerScore } from "../../../weekFixtures";
import PicksTable from "./PicksTable";

vi.mock("../../../context/AppDataContext", () => ({
  useScoreChanges: vi.fn(),
  useIsWinnerDecided: () => false,
}));

const mockScoreChanges = useScoreChanges as Mock;

function pick(
  label: string,
  status: Status = "yes",
  explanation = { header: `${label} header`, message: `${label} message` },
): PickResult {
  return { pick: label, status, explanation };
}

function player({
  name,
  college = [pick("C1 pick")],
  pro = [pick("P1 pick")],
  isKnockedOut = false,
}: {
  name: string;
  college?: Array<PickResult>;
  pro?: Array<PickResult>;
  isKnockedOut?: boolean;
}): PlayerScore {
  return playerScore({
    id: name,
    name,
    score: { total: 3, college: 1, pro: 2, proAgainstTheSpread: 2 },
    tiebreaker: { pick: 45, distance: 2 },
    college,
    pro,
    status: {
      hasNoPicks: false,
      isKnockedOut,
      explanation: isKnockedOut ? `${name} is out` : undefined,
    },
  });
}

const scores: RakMadnessScores = {
  tiebreaker: 47,
  scores: [
    player({
      name: "Alice",
      college: [pick("MICH"), pick("OSU", "no")],
      pro: [pick("BUF"), pick("KC", "incomplete"), pick("MIA", "unscoreable")],
    }),
    player({ name: "Bob", isKnockedOut: true }),
  ],
};

/** The table with the game status callback it reports clicks through. */
function renderPicks(showGameStatus = vi.fn()) {
  const user = userEvent.setup();
  render(
    <GameStatusContextProvider showGameStatus={showGameStatus}>
      <PicksTable scores={scores} />
    </GameStatusContextProvider>,
  );
  return { user, showGameStatus };
}

beforeEach(() => {
  localStorage.clear();
  mockScoreChanges.mockReturnValue({ picks: new Map(), players: new Map() });
});

describe("PicksTable, empty states", () => {
  it("renders nothing without scores", () => {
    const { container } = render(<PicksTable />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("PicksTable, headers", () => {
  it("labels one column per pick, C-prefixed then P-prefixed", () => {
    render(<PicksTable scores={scores} />);
    const headers = screen
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers).toEqual([
      "Rank",
      "Player",
      "C1",
      "C2",
      "College Score",
      "P1",
      "P2",
      "P3",
      "Pro Score",
      "Total Score",
    ]);
  });

  it("takes the column count from the first player", () => {
    const uneven: RakMadnessScores = {
      tiebreaker: 47,
      scores: [
        player({ name: "Alice", college: [pick("MICH")], pro: [pick("BUF")] }),
        player({
          name: "Bob",
          college: [pick("OSU"), pick("PSU")],
          pro: [pick("KC")],
        }),
      ],
    };
    render(<PicksTable scores={uneven} />);
    const headers = screen
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers).toContain("C1");
    expect(headers).not.toContain("C2");
  });

  it("marks every header cell with its column scope", () => {
    render(<PicksTable scores={scores} />);
    screen
      .getAllByRole("columnheader")
      .forEach((header) => expect(header).toHaveAttribute("scope", "col"));
  });
});

describe("PicksTable, accessible name", () => {
  it("names the table for a screen reader", () => {
    render(<PicksTable scores={scores} />);
    expect(screen.getByRole("table")).toHaveAccessibleName(
      "Player picks for the week, college and pro games",
    );
  });
});

describe("PicksTable, rows", () => {
  it("ranks players by their position in the list", () => {
    render(<PicksTable scores={scores} />);
    const firstRow = screen.getByText("Alice").closest("tr");
    expect(firstRow).toHaveTextContent("1");
    const secondRow = screen.getByText("Bob").closest("tr");
    expect(secondRow).toHaveTextContent("2");
  });

  it("shows each pick's text", () => {
    render(<PicksTable scores={scores} />);
    expect(screen.getByText("MICH")).toBeInTheDocument();
    expect(screen.getByText("OSU")).toBeInTheDocument();
    expect(screen.getByText("BUF")).toBeInTheDocument();
  });

  it("shows N/A for a pick with no text", () => {
    const blank: RakMadnessScores = {
      tiebreaker: 47,
      scores: [player({ name: "Alice", college: [pick("")], pro: [pick("")] })],
    };
    render(<PicksTable scores={blank} />);
    expect(screen.getAllByText("N/A")).toHaveLength(2);
  });

  it("tags each pick cell with its status", () => {
    render(<PicksTable scores={scores} />);
    expect(screen.getByText("MICH").closest("td")).toHaveClass("--yes");
    expect(screen.getByText("OSU").closest("td")).toHaveClass("--no");
    expect(screen.getByText("KC").closest("td")).toHaveClass("--incomplete");
    expect(screen.getByText("MIA").closest("td")).toHaveClass("--unscoreable");
  });

  it("fills a blank cell as a wrong pick, not an unscoreable one", () => {
    // The warning fill says the week cannot settle the game, which is not what a
    // blank says. A blank costs its player the point, the way a wrong pick does.
    const blank: RakMadnessScores = {
      tiebreaker: 47,
      scores: [
        player({
          name: "Alice",
          college: [
            pick("", "unscoreable", { header: MISSING_PICK, message: "none" }),
          ],
          pro: [pick("MIA", "unscoreable")],
        }),
      ],
    };
    render(<PicksTable scores={blank} />);
    const cells = screen.getAllByText("N/A");
    expect(cells[0].closest("td")).toHaveClass("--no");
    expect(screen.getByText("MIA").closest("td")).toHaveClass("--unscoreable");
  });

  it("announces a blank cell to a screen reader as a wrong pick", () => {
    const blank: RakMadnessScores = {
      tiebreaker: 47,
      scores: [
        player({
          name: "Alice",
          college: [
            pick("", "unscoreable", { header: MISSING_PICK, message: "none" }),
          ],
        }),
      ],
    };
    render(<PicksTable scores={blank} />);
    expect(screen.getAllByText("N/A")[0].closest("button")).toHaveTextContent(
      "Wrong",
    );
  });

  it("announces a pick's status for a screen reader, fill colors aside", () => {
    render(<PicksTable scores={scores} />);
    expect(screen.getByText("MICH").closest("button")).toHaveTextContent(
      "Right",
    );
    expect(screen.getByText("OSU").closest("button")).toHaveTextContent(
      "Wrong",
    );
    expect(screen.getByText("MIA").closest("button")).toHaveTextContent(
      "Unscoreable",
    );
  });

  it("adds nothing for an incomplete pick, which draws no color either", () => {
    render(<PicksTable scores={scores} />);
    expect(screen.getByText("KC").closest("button")?.textContent?.trim()).toBe(
      "KC",
    );
  });

  it("shows the college, pro, and total score per player", () => {
    render(<PicksTable scores={scores} />);
    const row = screen.getByText("Alice").closest("tr");
    expect(row).toHaveTextContent("1");
    expect(row).toHaveTextContent("2");
    expect(row).toHaveTextContent("3");
  });
});

describe("PicksTable, game status", () => {
  it("opens the game status on the column the cell sits in", async () => {
    const { user, showGameStatus } = renderPicks();
    await user.click(screen.getByText("OSU"));
    expect(showGameStatus).toHaveBeenCalledWith("C2");
  });

  it("counts the pro columns from one, not on from the college ones", async () => {
    const { user, showGameStatus } = renderPicks();
    await user.click(screen.getByText("KC"));
    expect(showGameStatus).toHaveBeenCalledWith("P2");
  });

  it("reports the same column from any player's row", async () => {
    const { user, showGameStatus } = renderPicks();
    // Alice's first college pick and Bob's, which are the same game.
    await user.click(screen.getByText("MICH"));
    await user.click(screen.getByText("C1 pick"));
    expect(showGameStatus).toHaveBeenNthCalledWith(1, "C1");
    expect(showGameStatus).toHaveBeenNthCalledWith(2, "C1");
  });

  it("reports the newest click, not the first", async () => {
    const { user, showGameStatus } = renderPicks();
    await user.click(screen.getByText("MICH"));
    await user.click(screen.getByText("MIA"));
    expect(showGameStatus).toHaveBeenCalledTimes(2);
    expect(showGameStatus).toHaveBeenLastCalledWith("P3");
  });
});

describe("PicksTable, a refresh's changes", () => {
  it("wipes a pick a refresh just resolved, carrying the status it left", () => {
    mockScoreChanges.mockReturnValue({
      picks: new Map([[pickChangeKey("Alice", "C1"), "incomplete"]]),
      players: new Map(),
    });
    render(<PicksTable scores={scores} />);

    const cell = screen.getByText("MICH").closest("button");
    expect(cell?.querySelector(".table__cell-wipe")).toHaveClass(
      "--incomplete",
    );
  });

  it("wipes nothing for a cell that did not change", () => {
    render(<PicksTable scores={scores} />);

    const cell = screen.getByText("MICH").closest("button");
    expect(cell?.querySelector(".table__cell-wipe")).not.toBeInTheDocument();
  });

  it("wipes a player's name cell once they are just knocked out", () => {
    mockScoreChanges.mockReturnValue({
      picks: new Map(),
      players: new Map([["Alice", false]]),
    });
    render(<PicksTable scores={scores} />);

    // The wipe holds a copy of the name row, so the name is on screen twice
    // while it runs. The cell is the one the row itself is in.
    const cell = screen.getByRole("button", { name: /Alice/ });
    expect(cell.querySelector(".table__cell-wipe")).toBeInTheDocument();
  });
});

describe("PicksTable, two players under one name", () => {
  const sharedName: RakMadnessScores = {
    scores: [
      playerScore({ id: "0", name: "Rip", college: [pick("MICH")], pro: [] }),
      playerScore({ id: "1", name: "Rip", college: [pick("OSU")], pro: [] }),
    ],
  };

  it("gives each row its own cells rather than folding them together", () => {
    render(<PicksTable scores={sharedName} />);

    expect(screen.getAllByText("Rip")).toHaveLength(2);
    expect(screen.getByText("MICH")).toBeInTheDocument();
    expect(screen.getByText("OSU")).toBeInTheDocument();
  });

  it("marks both name cells, since neither can be told from the other", () => {
    render(<PicksTable scores={sharedName} />);

    screen.getAllByText("Rip").forEach((name) => {
      expect(name.closest("td")).toHaveClass("--name-conflict");
    });
  });

  it("marks both with the warning a game nobody can score wears", () => {
    render(<PicksTable scores={sharedName} />);

    const icons = document.querySelectorAll(".player-status-icon");
    expect(icons).toHaveLength(2);
    icons.forEach((icon) => expect(icon).toHaveClass("--name-conflict"));
  });

  it("leaves a name only one row carries unmarked", () => {
    render(<PicksTable scores={scores} />);

    const cell = screen.getByText("Alice").closest("td") as HTMLElement;
    expect(cell).not.toHaveClass("--name-conflict");
    expect(cell.querySelector(".--name-conflict")).toBeNull();
  });
});

describe("PicksTable, the reader's own row", () => {
  // The provider seeds itself from storage as it mounts, so a name written here
  // is the reader's by the time the table renders.
  function renderAs(name: string) {
    localStorage.setItem(PLAYER_NAME_KEY, name);
    render(
      <SettingsContextProvider>
        <PicksTable scores={scores} />
      </SettingsContextProvider>,
    );
  }

  it("leaves every pick cell's own status class alone", () => {
    renderAs("Alice");

    expect(screen.getByText("MICH").closest("td")).toHaveClass("--yes");
    expect(screen.getByText("OSU").closest("td")).toHaveClass("--no");
    expect(screen.getByText("KC").closest("td")).toHaveClass("--incomplete");
    expect(screen.getByText("MIA").closest("td")).toHaveClass("--unscoreable");
  });
});

describe("PicksTable, live games", () => {
  function game(label: string, result?: LeagueResult): WeekGame {
    return {
      label,
      league: label.startsWith("C") ? League.COLLEGE : League.PRO,
      name: result?.name ?? label,
      result,
    };
  }

  // C1 is being played and P3 has stopped. The other three cover every state a
  // heading says nothing about: yet to kick off, over, and a column ESPN listed no
  // game for.
  const withGames: RakMadnessScores = {
    ...scores,
    games: [
      game(
        "C1",
        liveGame({ home: "MICH", away: "OSU", homeScore: 14, awayScore: 10 }),
      ),
      game("C2", upcomingGame({ home: "PSU", away: "IOWA" })),
      game(
        "P1",
        finalGame({ home: "BUF", away: "KC", homeScore: 24, awayScore: 20 }),
      ),
      game("P2"),
      game(
        "P3",
        delayedGame({
          home: "CLEM",
          away: "UNC",
          homeScore: 10,
          awayScore: 3,
          period: 4,
        }),
      ),
    ],
  };

  function header(label: string) {
    return screen.getByRole("columnheader", { name: new RegExp(`^${label}`) });
  }

  it("marks the column of a game being played", () => {
    render(<PicksTable scores={withGames} />);

    const live = header("C1");
    expect(live.querySelector(".table__live-dot")).toBeInTheDocument();
    expect(live).toHaveTextContent("Live");
  });

  it("marks the column of a game ESPN has stopped, in a pause rather than the dot", () => {
    render(<PicksTable scores={withGames} />);

    const delayed = header("P3");
    expect(delayed.querySelector(".table__delay-icon")).toBeInTheDocument();
    expect(delayed.querySelector(".table__live-dot")).toBeNull();
    expect(delayed).toHaveTextContent("Delayed");
  });

  it("leaves every column alone whose game is neither being played nor stopped", () => {
    render(<PicksTable scores={withGames} />);

    ["C2", "P1", "P2"].forEach((label) => {
      const quiet = header(label);
      expect(quiet.querySelector(".table__live-dot")).toBeNull();
      expect(quiet.querySelector(".table__delay-icon")).toBeNull();
      expect(quiet).not.toHaveTextContent("Live");
      expect(quiet).not.toHaveTextContent("Delayed");
    });
  });

  it("opens a game from its column heading", async () => {
    const showGameStatus = vi.fn();
    const user = userEvent.setup();
    render(
      <GameStatusContextProvider showGameStatus={showGameStatus}>
        <PicksTable scores={withGames} />
      </GameStatusContextProvider>,
    );

    await user.click(within(header("P1")).getByRole("button"));

    expect(showGameStatus).toHaveBeenCalledWith("P1");
  });

  it("marks nothing where the week carries no games", () => {
    render(<PicksTable scores={scores} />);

    expect(document.querySelector(".table__live-dot")).toBeNull();
    expect(document.querySelector(".table__delay-icon")).toBeNull();
  });
});
