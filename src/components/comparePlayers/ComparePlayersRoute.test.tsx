import { screen, waitFor, within } from "@testing-library/react";
import { useNavigate } from "react-router";

vi.mock("../../utils/getLeagueInfo");
vi.mock("../../utils/readFileToBuffer");
vi.mock("../../utils/scoring/getPlayerScores");
vi.mock("../../utils/buildSpreadsheetBuffer");

import {
  CURRENT_WEEK,
  SEASON,
  getPlayerScoresMock,
  mountApp,
  setUpAppTest,
  spreadsheetResponse,
} from "../../appTestFixtures";
import {
  EXPERIMENTAL_FEATURES_KEY,
  PLAYER_NAME_KEY,
} from "../../context/SettingsContext";
import { pick, player, week } from "../../utils/scoring/scoringTestFixtures";
import {
  COMPARED_PLAYERS_KEY,
  GAME_SCOPE_KEY,
  LEADER_KEY,
  PRESETS_KEY,
} from "./comparedPlayers";

const COMPARE_PATH = `/${SEASON}/${CURRENT_WEEK}/compare`;

/** Navigates the way the navbar's week switch does, which the test cannot reach. */
function GoToWeek({ path }: { path: string }) {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate(path)}>
      Go to week
    </button>
  );
}

/** Alice and Carol split on C2 and P1 only. Bob ranks between them. */
function compareScores() {
  return week([
    player({
      name: "Alice",
      total: 9,
      tiebreakerPick: 45,
      college: [pick("MICH"), pick("OSU")],
      pro: [pick("KC -3"), pick("BUF")],
    }),
    player({
      name: "Bob",
      total: 7,
      college: [pick("MICH"), pick("OSU")],
      pro: [pick("KC -3"), pick("BUF")],
    }),
    player({
      name: "Carol",
      total: 5,
      tiebreakerPick: 38,
      college: [pick("MICH"), pick("PSU")],
      pro: [pick("DEN 3"), pick("BUF")],
    }),
  ]);
}

/**
 * Opens the dialog the pickers are in, unless it is open already. The page opens
 * it itself when no player comes back from last time.
 */
async function openDialog(user: ReturnType<typeof mountApp>) {
  const opener = await waitFor(
    () =>
      screen.queryByRole("dialog") ??
      screen.getByRole("button", { name: "Choose" }),
  );
  if (opener.getAttribute("role") !== "dialog") await user.click(opener);
}

async function closeDialog(user: ReturnType<typeof mountApp>) {
  await user.click(screen.getByRole("button", { name: "Close" }));
}

/** Picks which games the table shows, from the toggle on the page. */
async function showGames(user: ReturnType<typeof mountApp>, scope: string) {
  await user.click(screen.getByRole("button", { name: scope }));
}

async function choose(
  user: ReturnType<typeof mountApp>,
  picker: string,
  name: string,
) {
  await openDialog(user);
  // The dialog opens on one picker, so a later one needs adding first.
  await screen.findAllByRole("combobox");
  if (!screen.queryByRole("combobox", { name: picker })) {
    await user.click(screen.getByRole("button", { name: "Add Player" }));
  }
  await user.click(await screen.findByRole("combobox", { name: picker }));
  await user.click(await screen.findByRole("option", { name }));
}

beforeEach(() => {
  setUpAppTest().mockResolvedValue(spreadsheetResponse());
  getPlayerScoresMock.mockResolvedValue(compareScores());
  localStorage.setItem(EXPERIMENTAL_FEATURES_KEY, "on");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the compare players route", () => {
  it("names the page", async () => {
    mountApp(COMPARE_PATH);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: `${SEASON} Week ${CURRENT_WEEK} Compare Players`,
      }),
    ).toBeInTheDocument();
  });

  it("opens on the pickers, with no picks, until a player is chosen", async () => {
    mountApp(COMPARE_PATH);

    expect(
      await screen.findByRole("dialog", { name: "Compare Players" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("starts on the reader's own player", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "carol");
    await openDialog(mountApp(COMPARE_PATH));

    expect(
      await screen.findByRole("combobox", { name: "Player 1" }),
    ).toHaveValue("Carol");
  });

  it("shows only the games two players picked differently", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");
    await closeDialog(user);
    await showGames(user, "Different");

    const table = await screen.findByRole("table", {
      name: "Picks where Alice and Carol differ",
    });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual([
      "Rank",
      "Player",
      "C2",
      "College Score",
      "P1",
      "Pro Score",
      "Pro Score ATS",
      "MNF Points Pick",
      "MNF Points Distance",
      "Total Score",
    ]);
  });

  it("shows each player's MNF points pick among the tiebreakers", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");
    await closeDialog(user);

    const table = await screen.findByRole("table");
    expect(within(table).getByRole("cell", { name: "45" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "38" })).toBeInTheDocument();
  });

  it("keeps each player's rank in the whole week", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");
    await closeDialog(user);

    const ranks = within(await screen.findByRole("table"))
      .getAllByRole("row")
      .map((row) => row.querySelector("td")?.textContent)
      .filter((rank) => rank);
    expect(ranks).toEqual(["1", "3"]);
  });

  it("leaves the player already chosen out of the other list", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await user.click(screen.getByRole("button", { name: "Add Player" }));

    await user.click(screen.getByRole("combobox", { name: "Player 2" }));

    expect(
      (await screen.findAllByRole("option")).map(
        (option) => option.textContent,
      ),
    ).toEqual(["Bob", "Carol"]);
  });

  it("says so when two players picked every game the same", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Bob");
    await closeDialog(user);
    await showGames(user, "Different");

    expect(
      await screen.findByText("They picked every game the same"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the finished games they split beside the open ones", async () => {
    getPlayerScoresMock.mockResolvedValue(
      week([
        player({
          name: "Cal",
          total: 1,
          pro: [pick("KC", "yes"), pick("SF"), pick("BUF")],
        }),
        player({
          name: "Dee",
          pro: [pick("DEN", "no"), pick("LAR"), pick("BUF")],
        }),
      ]),
    );
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Cal");
    await choose(user, "Player 2", "Dee");
    await closeDialog(user);
    await showGames(user, "Different");

    const headers = within(await screen.findByRole("table"))
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers).toEqual(expect.arrayContaining(["P1", "P2"]));
    expect(headers).not.toContain("P3");
  });

  it("shows every game by default", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");
    await closeDialog(user);

    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const table = await screen.findByRole("table", {
      name: "Picks of Alice and Carol",
    });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers).toEqual(expect.arrayContaining(["C1", "C2", "P1", "P2"]));
  });

  it("shows only the games the players picked alike", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");
    await closeDialog(user);
    await showGames(user, "Same");

    const table = await screen.findByRole("table", {
      name: "Picks where Alice and Carol agree",
    });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers).toEqual(expect.arrayContaining(["C1", "P2"]));
    expect(headers).not.toContain("C2");
    expect(headers).not.toContain("P1");
  });

  it("adds a third player to the table", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");
    await user.click(screen.getByRole("button", { name: "Add Player" }));
    await choose(user, "Player 3", "Bob");
    await closeDialog(user);

    expect(
      await screen.findByRole("table", {
        name: "Picks of Alice, Carol, and Bob",
      }),
    ).toBeInTheDocument();
  });

  it("removes a player, keeping the others in their pickers", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");
    await user.click(screen.getByRole("button", { name: "Add Player" }));
    await choose(user, "Player 3", "Bob");

    await user.click(screen.getByRole("button", { name: "Remove Player 2" }));

    expect(screen.getByRole("combobox", { name: "Player 1" })).toHaveValue(
      "Alice",
    );
    expect(screen.getByRole("combobox", { name: "Player 2" })).toHaveValue(
      "Bob",
    );
    expect(
      JSON.parse(localStorage.getItem(COMPARED_PLAYERS_KEY) ?? ""),
    ).toEqual(["Alice", "Bob"]);
  });

  it("removes players down to one picker", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");

    await user.click(screen.getByRole("button", { name: "Remove Player 2" }));

    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Remove Player 1" }),
    ).toBeDisabled();
  });

  it("shows one chosen player alone, with no games to split", async () => {
    localStorage.setItem(COMPARED_PLAYERS_KEY, JSON.stringify(["Bob"]));
    mountApp(COMPARE_PATH);

    expect(
      await screen.findByRole("table", { name: "Picks of Bob" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Different" })).toBeDisabled();
  });

  it("moves focus to the picker that takes a removed one's place", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");
    await user.click(screen.getByRole("button", { name: "Add Player" }));
    await choose(user, "Player 3", "Bob");

    await user.click(screen.getByRole("button", { name: "Remove Player 2" }));

    expect(screen.getByRole("combobox", { name: "Player 2" })).toHaveFocus();
  });

  it("returns focus to Choose from the dialog the page opened", async () => {
    const user = mountApp(COMPARE_PATH);
    await screen.findByRole("dialog", { name: "Compare Players" });

    await closeDialog(user);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Choose" })).toHaveFocus(),
    );
  });

  it("holds Choose down while the dialog is open", async () => {
    const user = mountApp(COMPARE_PATH);
    await screen.findByRole("dialog", { name: "Compare Players" });
    const choose = screen.getByRole("button", { name: "Choose", hidden: true });
    expect(choose).toHaveAttribute("data-popup-open");
    expect(choose).toHaveAttribute("aria-expanded", "true");

    await closeDialog(user);

    await waitFor(() => expect(choose).not.toHaveAttribute("data-popup-open"));
    expect(choose).toHaveAttribute("aria-expanded", "false");
  });

  it("focuses an added picker once, not again on reopen", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");
    await user.click(screen.getByRole("button", { name: "Add Player" }));
    await choose(user, "Player 3", "Bob");
    await closeDialog(user);

    await user.click(screen.getByRole("button", { name: "Choose" }));

    expect(
      await screen.findByRole("combobox", { name: "Player 3" }),
    ).not.toHaveFocus();
  });

  it("drops empty pickers when the dialog opens again", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await user.click(screen.getByRole("button", { name: "Add Player" }));
    await choose(user, "Player 3", "Carol");
    await closeDialog(user);

    await user.click(screen.getByRole("button", { name: "Choose" }));

    expect(
      await screen.findByRole("combobox", { name: "Player 1" }),
    ).toHaveValue("Alice");
    expect(screen.getByRole("combobox", { name: "Player 2" })).toHaveValue(
      "Carol",
    );
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });

  it("keeps one picker when the dialog opens again with none chosen", async () => {
    const user = mountApp(COMPARE_PATH);
    await screen.findByRole("dialog", { name: "Compare Players" });
    await user.click(screen.getByRole("button", { name: "Add Player" }));
    await closeDialog(user);

    await user.click(screen.getByRole("button", { name: "Choose" }));

    expect(
      await screen.findByRole("combobox", { name: "Player 1" }),
    ).toHaveValue("");
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("holds a saved scope with no table and no message until a player is chosen", async () => {
    localStorage.setItem(GAME_SCOPE_KEY, "different");
    const user = mountApp(COMPARE_PATH);
    await screen.findByRole("dialog", { name: "Compare Players" });
    await closeDialog(user);

    expect(screen.getByRole("button", { name: "Different" })).toBeDisabled();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("says so when the players picked every game differently", async () => {
    getPlayerScoresMock.mockResolvedValue(
      week([
        player({ name: "Alice", pro: [pick("KC -3"), pick("BUF")] }),
        player({ name: "Carol", pro: [pick("DEN 3"), pick("NYJ")] }),
      ]),
    );
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Alice", "Carol"]),
    );
    const user = mountApp(COMPARE_PATH);
    await screen.findByRole("table");

    await showGames(user, "Same");

    expect(
      await screen.findByText("They picked every game differently"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("focuses the picker Add Player makes", async () => {
    const user = mountApp(COMPARE_PATH);
    await openDialog(user);
    await user.click(await screen.findByRole("button", { name: "Add Player" }));

    expect(screen.getByRole("combobox", { name: "Player 2" })).toHaveFocus();
  });

  it("hides Add Player once every player has a picker", async () => {
    const user = mountApp(COMPARE_PATH);
    await openDialog(user);
    await user.click(await screen.findByRole("button", { name: "Add Player" }));

    await user.click(screen.getByRole("button", { name: "Add Player" }));

    expect(
      screen.queryByRole("button", { name: "Add Player" }),
    ).not.toBeInTheDocument();
  });

  it("stops at ten players", async () => {
    getPlayerScoresMock.mockResolvedValue(
      week(
        Array.from({ length: 12 }, (_, index) =>
          player({ name: `Player ${String.fromCharCode(65 + index)}` }),
        ),
      ),
    );
    const user = mountApp(COMPARE_PATH);
    await openDialog(user);
    await screen.findByRole("button", { name: "Add Player" });

    for (let added = 0; added < 9; added++) {
      await user.click(screen.getByRole("button", { name: "Add Player" }));
    }

    expect(screen.getAllByRole("combobox")).toHaveLength(10);
    expect(
      screen.queryByRole("button", { name: "Add Player" }),
    ).not.toBeInTheDocument();
  });

  it("saves the chosen players and opens on them next time", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Carol");
    await choose(user, "Player 2", "Alice");

    expect(
      JSON.parse(localStorage.getItem(COMPARED_PLAYERS_KEY) ?? ""),
    ).toEqual(["Carol", "Alice"]);
  });

  it("keeps saved players this week lacks, marked as having no picks", async () => {
    const saved = JSON.stringify(["Gone", "Alice", "Missing"]);
    localStorage.setItem(COMPARED_PLAYERS_KEY, saved);
    await openDialog(mountApp(COMPARE_PATH));

    const gone = await screen.findByRole("combobox", { name: "Player 1" });
    expect(gone).toHaveValue("Gone");
    expect(gone).toHaveAccessibleDescription("No picks this week");
    expect(screen.getByRole("combobox", { name: "Player 2" })).toHaveValue(
      "Alice",
    );
    expect(screen.getByRole("combobox", { name: "Player 3" })).toHaveValue(
      "Missing",
    );
    expect(localStorage.getItem(COMPARED_PLAYERS_KEY)).toBe(saved);
  });

  it("keeps saved players when an empty picker is removed", async () => {
    const saved = JSON.stringify(["Gone", "Alice", "Carol"]);
    localStorage.setItem(COMPARED_PLAYERS_KEY, saved);
    const user = mountApp(COMPARE_PATH);
    await openDialog(user);
    await user.click(await screen.findByRole("button", { name: "Add Player" }));

    await user.click(screen.getByRole("button", { name: "Remove Player 4" }));

    expect(localStorage.getItem(COMPARED_PLAYERS_KEY)).toBe(saved);
  });

  it("opens on the saved players in their saved order", async () => {
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Bob", "Gone", "Alice", "Carol"]),
    );
    await openDialog(mountApp(COMPARE_PATH));

    expect(
      (await screen.findAllByRole("combobox")).map((picker) =>
        picker.getAttribute("value"),
      ),
    ).toEqual(["Bob", "Gone", "Alice", "Carol"]);
  });

  it("strikes through a saved player this week lacks", async () => {
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Alice", "Dave"]),
    );
    await openDialog(mountApp(COMPARE_PATH));

    const picker = await screen.findByRole("combobox", { name: "Player 2" });
    expect(picker.parentElement?.querySelector("s")).toHaveTextContent("Dave");
  });

  it("matches saved names to the week's rows whatever their case", async () => {
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["ALICE", "carol"]),
    );
    mountApp(COMPARE_PATH);

    expect(
      await screen.findByRole("table", { name: "Picks of Alice and Carol" }),
    ).toBeInTheDocument();
  });

  it("shows a saved player this week lacks as a row with no picks", async () => {
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Alice", "Dave"]),
    );
    mountApp(COMPARE_PATH);

    const table = await screen.findByRole("table", {
      name: "Picks of Alice and Dave",
    });
    const rows = within(table)
      .getAllByRole("row")
      .map((row) =>
        Array.from(row.querySelectorAll("td"), (cell) => cell.textContent),
      )
      .filter((cells) => cells.length > 0 && cells[1] !== "");
    expect(rows[0][0]).toBe("1");
    expect(rows[1]).toEqual(["N/A", "Dave", ...Array(10).fill("N/A")]);
  });

  it("keeps a saved player this week lacks when the reader changes another", async () => {
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Alice", "Dave"]),
    );
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Carol");

    expect(
      JSON.parse(localStorage.getItem(COMPARED_PLAYERS_KEY) ?? ""),
    ).toEqual(["Carol", "Dave"]);
  });

  it("replaces a saved player this week lacks with the one chosen", async () => {
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Alice", "Dave"]),
    );
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 2", "Carol");

    const picker = screen.getByRole("combobox", { name: "Player 2" });
    expect(picker).toHaveValue("Carol");
    expect(picker).not.toHaveAccessibleDescription();
    expect(
      JSON.parse(localStorage.getItem(COMPARED_PLAYERS_KEY) ?? ""),
    ).toEqual(["Alice", "Carol"]);
  });

  it("splits games only among the players with picks", async () => {
    localStorage.setItem(GAME_SCOPE_KEY, "different");
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Alice", "Dave"]),
    );
    mountApp(COMPARE_PATH);

    const table = await screen.findByRole("table");
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(expect.arrayContaining(["C1", "C2", "P1", "P2"]));
    expect(screen.getByRole("button", { name: "Different" })).toBeDisabled();
  });

  it("names every game in the caption when the scope cannot apply", async () => {
    localStorage.setItem(GAME_SCOPE_KEY, "different");
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Alice", "Dave"]),
    );
    mountApp(COMPARE_PATH);

    expect(
      await screen.findByRole("table", { name: "Picks of Alice and Dave" }),
    ).toBeInTheDocument();
  });

  it("adds no empty row for a name saved twice that the week has once", async () => {
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Alice", "Alice", "Carol"]),
    );
    mountApp(COMPARE_PATH);

    const table = await screen.findByRole("table", {
      name: "Picks of Alice and Carol",
    });
    expect(within(table).getAllByText("Alice")).toHaveLength(1);
  });

  it("keeps a player through a week that lacks them", async () => {
    // A fresh response per week, since a body reads only once.
    vi.mocked(fetch).mockImplementation(async () => spreadsheetResponse());
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Alice", "Bob"]),
    );
    getPlayerScoresMock.mockResolvedValue(
      week([
        player({ name: "Alice", college: [pick("MICH")], pro: [pick("KC")] }),
      ]),
    );
    const user = mountApp(COMPARE_PATH, {
      beside: <GoToWeek path={`/${SEASON}/${CURRENT_WEEK - 1}/compare`} />,
    });
    await screen.findByRole("table", { name: "Picks of Alice and Bob" });

    getPlayerScoresMock.mockResolvedValue(compareScores());
    await user.click(screen.getByRole("button", { name: "Go to week" }));

    const table = await screen.findByRole("table", {
      name: "Picks of Alice and Bob",
    });
    await waitFor(() =>
      expect(within(table).getAllByRole("cell", { name: "BUF" })).toHaveLength(
        2,
      ),
    );
  });

  it("saves the game scope", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");
    await closeDialog(user);
    await showGames(user, "Different");

    expect(localStorage.getItem(GAME_SCOPE_KEY)).toBe("different");
  });

  it("opens on the saved game scope", async () => {
    localStorage.setItem(GAME_SCOPE_KEY, "same");
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Alice", "Carol"]),
    );
    mountApp(COMPARE_PATH);

    expect(
      await screen.findByRole("table", {
        name: "Picks where Alice and Carol agree",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Same" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("groups Choose and the leader toggle under Players", async () => {
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Alice", "Carol"]),
    );
    mountApp(COMPARE_PATH);

    const players = await screen.findByRole("group", { name: "Players" });
    expect(
      within(players)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Choose", "Show Leader"]);
  });

  it("adds the leader to the players chosen", async () => {
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Bob", "Carol"]),
    );
    const user = mountApp(COMPARE_PATH);
    await screen.findByRole("table", { name: "Picks of Bob and Carol" });

    await user.click(screen.getByRole("button", { name: "Show Leader" }));

    const table = await screen.findByRole("table", {
      name: "Picks of Bob, Carol, and Alice",
    });
    expect(within(table).getByText("Alice")).toBeInTheDocument();
  });

  it("compares one chosen player with the leader", async () => {
    localStorage.setItem(LEADER_KEY, "on");
    localStorage.setItem(COMPARED_PLAYERS_KEY, JSON.stringify(["Bob"]));
    mountApp(COMPARE_PATH);

    expect(
      await screen.findByRole("table", { name: "Picks of Bob and Alice" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("splits games with the leader among the players", async () => {
    localStorage.setItem(LEADER_KEY, "on");
    localStorage.setItem(GAME_SCOPE_KEY, "different");
    localStorage.setItem(COMPARED_PLAYERS_KEY, JSON.stringify(["Bob"]));
    mountApp(COMPARE_PATH);

    expect(
      await screen.findByText("They picked every game the same"),
    ).toBeInTheDocument();
  });

  it("adds no second row for a leader already chosen", async () => {
    localStorage.setItem(LEADER_KEY, "on");
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Alice", "Carol"]),
    );
    mountApp(COMPARE_PATH);

    const table = await screen.findByRole("table", {
      name: "Picks of Alice and Carol",
    });
    expect(within(table).getAllByText("Alice")).toHaveLength(1);
  });

  it("shows the leader once when the reader then chooses them", async () => {
    localStorage.setItem(LEADER_KEY, "on");
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Bob", "Carol"]),
    );
    const user = mountApp(COMPARE_PATH);
    await screen.findByRole("table", {
      name: "Picks of Bob, Carol, and Alice",
    });

    await choose(user, "Player 2", "Alice");
    await closeDialog(user);

    const table = await screen.findByRole("table", {
      name: "Picks of Bob and Alice",
    });
    expect(within(table).getAllByText("Alice")).toHaveLength(1);
  });

  it("adds the leader past the ten players chosen", async () => {
    const names = Array.from(
      { length: 11 },
      (_, index) => `Player ${String.fromCharCode(65 + index)}`,
    );
    getPlayerScoresMock.mockResolvedValue(
      week(names.map((name) => player({ name }))),
    );
    localStorage.setItem(LEADER_KEY, "on");
    localStorage.setItem(COMPARED_PLAYERS_KEY, JSON.stringify(names.slice(1)));
    mountApp(COMPARE_PATH);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Player A")).toBeInTheDocument();
    expect(within(table).getByText("Player K")).toBeInTheDocument();
  });

  it("saves whether the leader shows", async () => {
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Bob", "Carol"]),
    );
    const user = mountApp(COMPARE_PATH);
    await screen.findByRole("table");
    const toggle = screen.getByRole("button", { name: "Show Leader" });

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem(LEADER_KEY)).toBe("on");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(localStorage.getItem(LEADER_KEY)).toBeNull();
  });

  it("calls the leader the winner once the week is complete", async () => {
    getPlayerScoresMock.mockResolvedValue(
      week(
        [
          player({ name: "Alice", total: 1, pro: [pick("KC", "yes")] }),
          player({ name: "Bob", pro: [pick("DEN", "no")] }),
        ],
        40,
      ),
    );
    localStorage.setItem(COMPARED_PLAYERS_KEY, JSON.stringify(["Bob"]));
    const user = mountApp(COMPARE_PATH);
    await openDialog(user);
    await closeDialog(user);

    await user.click(
      await screen.findByRole("button", { name: "Show Winner" }),
    );

    expect(
      await screen.findByRole("table", { name: "Picks of Bob and Alice" }),
    ).toBeInTheDocument();
  });

  it("sends a reader without experimental features to the scoreboard", async () => {
    localStorage.removeItem(EXPERIMENTAL_FEATURES_KEY);
    mountApp(COMPARE_PATH);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: `${SEASON} Week ${CURRENT_WEEK} Scoreboard`,
      }),
    ).toBeInTheDocument();
  });
});

async function savePresetAs(user: ReturnType<typeof mountApp>, name: string) {
  const field = screen.getByRole("textbox", { name: "Preset Name" });
  await user.clear(field);
  await user.type(field, name);
  await user.click(screen.getByRole("button", { name: /^(Save|Replace)$/ }));
}

async function loadPreset(user: ReturnType<typeof mountApp>, name: string) {
  await user.click(screen.getByRole("button", { name: "Load Preset" }));
  await user.click(await screen.findByRole("menuitem", { name }));
}

describe("compare presets", () => {
  it("loads the players saved under a name", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Carol");
    await choose(user, "Player 2", "Alice");
    await savePresetAs(user, "Rivals");
    await user.click(screen.getByRole("button", { name: "Remove Player 2" }));

    await loadPreset(user, "Rivals");

    expect(screen.getByRole("combobox", { name: "Player 1" })).toHaveValue(
      "Carol",
    );
    expect(screen.getByRole("combobox", { name: "Player 2" })).toHaveValue(
      "Alice",
    );
    expect(
      JSON.parse(localStorage.getItem(COMPARED_PLAYERS_KEY) ?? ""),
    ).toEqual(["Carol", "Alice"]);
  });

  it("loads a preset saved before the page opened", async () => {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([{ name: "Family", players: ["Bob"] }]),
    );
    const user = mountApp(COMPARE_PATH);
    await openDialog(user);

    await loadPreset(user, "Family");

    expect(screen.getByRole("combobox", { name: "Player 1" })).toHaveValue(
      "Bob",
    );
    expect(screen.getByRole("textbox", { name: "Preset Name" })).toHaveValue(
      "Family",
    );
  });

  it("keeps a preset's player this week lacks, marked as having no picks", async () => {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([{ name: "Old", players: ["Gone", "Alice"] }]),
    );
    const user = mountApp(COMPARE_PATH);
    await openDialog(user);

    await loadPreset(user, "Old");

    const gone = screen.getByRole("combobox", { name: "Player 1" });
    expect(gone).toHaveValue("Gone");
    expect(gone).toHaveAccessibleDescription("No picks this week");
  });

  it("replaces a preset saved under the same name in any case", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Carol");
    await savePresetAs(user, "Rivals");
    await choose(user, "Player 1", "Bob");
    await user.clear(screen.getByRole("textbox", { name: "Preset Name" }));
    await user.type(
      screen.getByRole("textbox", { name: "Preset Name" }),
      "rivals",
    );

    await user.click(screen.getByRole("button", { name: "Replace" }));

    expect(JSON.parse(localStorage.getItem(PRESETS_KEY) ?? "")).toEqual([
      { name: "rivals", players: ["Bob"] },
    ]);
  });

  it("deletes the preset the name field names", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Carol");
    await savePresetAs(user, "Rivals");

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(localStorage.getItem(PRESETS_KEY)).toBeNull();
    expect(screen.getByRole("button", { name: "Load Preset" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Preset Name" })).toHaveFocus();
  });

  it("says why each preset action is unavailable", async () => {
    await openDialog(mountApp(COMPARE_PATH));

    expect(
      await screen.findByRole("button", { name: "Load Preset" }),
    ).toHaveAccessibleDescription("No presets saved");
    expect(
      screen.getByRole("button", { name: "Save" }),
    ).toHaveAccessibleDescription("Name the preset first");
    expect(
      screen.getByRole("button", { name: "Delete" }),
    ).toHaveAccessibleDescription("No preset by this name");
  });

  it("saves no preset while no picker holds a player", async () => {
    const user = mountApp(COMPARE_PATH);
    await openDialog(user);

    await user.type(
      await screen.findByRole("textbox", { name: "Preset Name" }),
      "Empty",
    );

    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    expect(save).toHaveAccessibleDescription("Choose a player first");
  });
});
