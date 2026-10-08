import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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
  MAX_PRESET_NAME,
  MAX_PRESETS,
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
      await screen.findByRole("dialog", { name: "Choose Players" }),
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

  it("focuses no picker after a remove", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");
    await user.click(screen.getByRole("button", { name: "Add Player" }));
    await choose(user, "Player 3", "Bob");

    await user.click(screen.getByRole("button", { name: "Remove Player 2" }));

    for (const picker of screen.getAllByRole("combobox")) {
      expect(picker).not.toHaveFocus();
    }
  });

  it("returns focus to Choose from the dialog the page opened", async () => {
    const user = mountApp(COMPARE_PATH);
    await screen.findByRole("dialog", { name: "Choose Players" });

    await closeDialog(user);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Choose" })).toHaveFocus(),
    );
  });

  it("holds Choose down while the dialog is open", async () => {
    const user = mountApp(COMPARE_PATH);
    await screen.findByRole("dialog", { name: "Choose Players" });
    const choose = screen.getByRole("button", {
      name: "Choose",
      hidden: true,
    });
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
    await screen.findByRole("dialog", { name: "Choose Players" });
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
    await screen.findByRole("dialog", { name: "Choose Players" });
    await closeDialog(user);

    expect(screen.getByRole("button", { name: "Different" })).toBeDisabled();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    for (const status of screen.getAllByRole("status")) {
      expect(status).toBeEmptyDOMElement();
    }
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

  it("groups Choose, Presets and the leader toggle under Players", async () => {
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Alice", "Carol"]),
    );
    mountApp(COMPARE_PATH);

    const players = await screen.findByRole("group", { name: "Players" });
    const [choose, presets, leader] = within(players).getAllByRole("button");
    expect(choose).toHaveAccessibleName("Choose");
    expect(presets).toHaveAccessibleName("Presets");
    expect(leader).toHaveAccessibleName("Leader");
  });

  it("adds the leader to the players chosen", async () => {
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Bob", "Carol"]),
    );
    const user = mountApp(COMPARE_PATH);
    await screen.findByRole("table", { name: "Picks of Bob and Carol" });

    await user.click(screen.getByRole("button", { name: "Leader" }));

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
    const toggle = screen.getByRole("button", { name: "Leader" });

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem(LEADER_KEY)).toBe("on");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(localStorage.getItem(LEADER_KEY)).toBeNull();
  });

  it("adds the winner once the week is complete", async () => {
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

    await user.click(await screen.findByRole("button", { name: "Leader" }));

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

/** Opens the Presets dialog from the loaded page, closing the pickers first. */
async function openPresets(user: ReturnType<typeof mountApp>) {
  await openDialog(user);
  await closeDialog(user);
  await user.click(screen.getByRole("button", { name: "Presets" }));
  return screen.findByRole("dialog", { name: "Player Presets" });
}

async function savePresetAs(user: ReturnType<typeof mountApp>, name: string) {
  const dialog = await openPresets(user);
  await user.type(
    within(dialog).getByRole("textbox", { name: "Preset Name" }),
    name,
  );
  const save = within(dialog).getByRole("button", {
    name: /^(Create Preset|Update Preset)$/,
  });
  // Update takes a second press to confirm.
  const presses = save.textContent === "Update Preset" ? 2 : 1;
  for (let press = 0; press < presses; press++) await user.click(save);
  await closeDialog(user);
}

describe("compare presets", () => {
  it("loads the players saved under a name and closes", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Carol");
    await choose(user, "Player 2", "Alice");
    await savePresetAs(user, "Rivals");
    await choose(user, "Player 2", "Bob");
    await closeDialog(user);

    const dialog = await openPresets(user);
    await user.click(within(dialog).getByRole("button", { name: "Rivals" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Player Presets" }),
      ).not.toBeInTheDocument(),
    );
    expect(
      JSON.parse(localStorage.getItem(COMPARED_PLAYERS_KEY) ?? ""),
    ).toEqual(["Carol", "Alice"]);
    expect(screen.getByRole("button", { name: "Presets" })).toHaveFocus();
    expect(screen.getByText("Loaded Rivals")).toHaveAttribute("role", "status");
  });

  it("keeps a preset's player this week lacks, marked as having no picks", async () => {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([{ name: "Old", players: ["Gone", "Alice"] }]),
    );
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);
    await user.click(within(dialog).getByRole("button", { name: "Old" }));
    await openDialog(user);

    const gone = await screen.findByRole("combobox", { name: "Player 1" });
    expect(gone).toHaveValue("Gone");
    expect(gone).toHaveAccessibleDescription("No picks this week");
  });

  it("replaces a preset saved under the same name in any case", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Carol");
    await savePresetAs(user, "Rivals");
    await choose(user, "Player 1", "Bob");

    await savePresetAs(user, "rivals");

    expect(JSON.parse(localStorage.getItem(PRESETS_KEY) ?? "")).toEqual([
      { name: "rivals", players: ["Bob"] },
    ]);
  });

  it("renames a preset, and returns focus to its rename key", async () => {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([{ name: "Family", players: ["Bob"] }]),
    );
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Rename Family" }),
    );
    const field = within(dialog).getByRole("textbox", {
      name: "New name for Family",
    });
    expect(field).toHaveFocus();
    await user.clear(field);
    await user.type(field, "Kin{Enter}");

    expect(JSON.parse(localStorage.getItem(PRESETS_KEY) ?? "")).toEqual([
      { name: "Kin", players: ["Bob"] },
    ]);
    expect(
      within(dialog).getByRole("button", { name: "Rename Kin" }),
    ).toHaveFocus();
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "Renamed Family to Kin",
    );
  });

  it("drops an unsaved rename when the dialog closes", async () => {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([{ name: "Family", players: ["Bob"] }]),
    );
    const user = mountApp(COMPARE_PATH);
    let dialog = await openPresets(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Rename Family" }),
    );
    await user.type(
      within(dialog).getByRole("textbox", { name: "New name for Family" }),
      "Kin",
    );
    await closeDialog(user);
    await user.click(screen.getByRole("button", { name: "Presets" }));
    dialog = await screen.findByRole("dialog", { name: "Player Presets" });

    expect(
      within(dialog).queryByRole("textbox", { name: "New name for Family" }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Rename Family" }),
    ).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(PRESETS_KEY) ?? "")).toEqual([
      { name: "Family", players: ["Bob"] },
    ]);
  });

  it("leaves the focus in the name field when a renamed name is saved again", async () => {
    localStorage.setItem(COMPARED_PLAYERS_KEY, JSON.stringify(["Bob"]));
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([{ name: "Family", players: ["Bob"] }]),
    );
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Rename Family" }),
    );
    const draft = within(dialog).getByRole("textbox", {
      name: "New name for Family",
    });
    await user.clear(draft);
    await user.type(draft, "Kin{Enter}");
    const deleteKin = within(dialog).getByRole("button", {
      name: "Delete Kin",
    });
    await user.click(deleteKin);
    await user.click(deleteKin);
    const field = within(dialog).getByRole("textbox", { name: "Preset Name" });
    await user.type(field, "Kin{Enter}");

    expect(
      within(dialog).getByRole("button", { name: "Rename Kin" }),
    ).toBeInTheDocument();
    expect(field).toHaveFocus();
  });

  it("gives a reason when the new name is blank", async () => {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([{ name: "Family", players: ["Bob"] }]),
    );
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Rename Family" }),
    );
    await user.clear(
      within(dialog).getByRole("textbox", { name: "New name for Family" }),
    );

    expect(
      within(dialog).getByRole("button", { name: "Save the name of Family" }),
    ).toBeDisabled();
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Type a new name",
    );
  });

  it("announces a long name as the preset stores it", async () => {
    localStorage.setItem(COMPARED_PLAYERS_KEY, JSON.stringify(["Bob"]));
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);
    const field = within(dialog).getByRole("textbox", { name: "Preset Name" });
    const long = "x".repeat(MAX_PRESET_NAME + 4);

    // A paste or an input method can put more in a field than `maxLength` lets typing.
    fireEvent.change(field, { target: { value: long } });
    await user.type(field, "{Enter}");

    expect(within(dialog).getByRole("status")).toHaveTextContent(
      `Saved ${long.slice(0, MAX_PRESET_NAME)}`,
    );
    expect(within(dialog).getByRole("status")).not.toHaveTextContent(long);
  });

  it("updates a preset only on a second press", async () => {
    localStorage.setItem(COMPARED_PLAYERS_KEY, JSON.stringify(["Alice"]));
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([{ name: "Kin", players: ["Bob"] }]),
    );
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);
    const field = within(dialog).getByRole("textbox", { name: "Preset Name" });
    await user.type(field, "kin");
    const update = within(dialog).getByRole("button", {
      name: "Update Preset",
    });

    await user.click(update);

    expect(update).toHaveAccessibleDescription("Press again to confirm");
    expect(JSON.parse(localStorage.getItem(PRESETS_KEY) ?? "")).toEqual([
      { name: "Kin", players: ["Bob"] },
    ]);
    await user.type(field, "x");
    await user.type(field, "{Backspace}");
    expect(update).not.toHaveAccessibleDescription();
    await user.click(update);
    await user.click(update);
    expect(JSON.parse(localStorage.getItem(PRESETS_KEY) ?? "")).toEqual([
      { name: "kin", players: ["Alice"] },
    ]);
    expect(field).toHaveFocus();
  });

  it("keeps focus in the name field after a save by its key", async () => {
    localStorage.setItem(COMPARED_PLAYERS_KEY, JSON.stringify(["Alice"]));
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);
    const field = within(dialog).getByRole("textbox", { name: "Preset Name" });

    await user.type(field, "Kin");
    await user.click(
      within(dialog).getByRole("button", { name: "Create Preset" }),
    );

    expect(field).toHaveFocus();
  });

  it("backs out of a rename on Escape and keeps the dialog open", async () => {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([{ name: "Family", players: ["Bob"] }]),
    );
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Rename Family" }),
    );
    await user.type(
      within(dialog).getByRole("textbox", { name: "New name for Family" }),
      "Kin{Escape}",
    );

    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Rename Family" }),
    ).toHaveFocus();
  });

  it("moves focus to a renamed neighbor's draft after a delete", async () => {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([
        { name: "Family", players: ["Bob"] },
        { name: "Rivals", players: ["Carol"] },
      ]),
    );
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Rename Rivals" }),
    );
    const draft = within(dialog).getByRole("textbox", {
      name: "New name for Rivals",
    });
    await user.clear(draft);
    const deleteFamily = within(dialog).getByRole("button", {
      name: "Delete Family",
    });

    await user.click(deleteFamily);
    await user.click(deleteFamily);

    expect(draft).toHaveFocus();
  });

  it("lists a preset another tab saves", async () => {
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);

    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([{ name: "Family", players: ["Bob"] }]),
    );
    fireEvent(window, new StorageEvent("storage", { key: PRESETS_KEY }));

    expect(
      await within(dialog).findByRole("button", { name: "Family" }),
    ).toBeInTheDocument();
  });

  it("counts an emoji as one character of a name", async () => {
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);
    const field = within(dialog).getByRole("textbox", { name: "Preset Name" });
    const name = "👨‍👩‍👧".repeat(MAX_PRESET_NAME);

    fireEvent.change(field, { target: { value: `${name}🏀` } });

    expect(field).toHaveValue(name);
  });

  it("announces a second save under the same name", async () => {
    localStorage.setItem(COMPARED_PLAYERS_KEY, JSON.stringify(["Bob"]));
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);
    const field = within(dialog).getByRole("textbox", { name: "Preset Name" });
    const status = within(dialog).getByRole("status");

    await user.type(field, "Kin{Enter}");
    const first = status.textContent;
    await user.type(field, "Kin{Enter}{Enter}");

    expect(status).toHaveTextContent("Saved Kin");
    expect(status.textContent).not.toBe(first);
  });

  it("refuses a rename to another preset's name", async () => {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([
        { name: "Family", players: ["Bob"] },
        { name: "Rivals", players: ["Carol"] },
      ]),
    );
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);

    await user.click(
      within(dialog).getByRole("button", { name: "Rename Family" }),
    );
    const field = within(dialog).getByRole("textbox", {
      name: "New name for Family",
    });
    await user.clear(field);
    await user.type(field, "RIVALS");

    expect(field).toHaveAccessibleDescription("Another preset has this name");
    expect(
      within(dialog).getByRole("button", { name: "Save the name of Family" }),
    ).toBeDisabled();
  });

  it("deletes only on a second press, and a press elsewhere disarms", async () => {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([{ name: "Family", players: ["Bob"] }]),
    );
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);
    const deleteFamily = within(dialog).getByRole("button", {
      name: "Delete Family",
    });

    await user.click(deleteFamily);

    expect(deleteFamily).toHaveAccessibleDescription("Press again to confirm");
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "Press again to confirm",
    );
    await user.click(
      within(dialog).getByRole("textbox", { name: "Preset Name" }),
    );
    expect(within(dialog).queryByRole("alert")).toBeNull();
    await user.click(deleteFamily);
    expect(
      within(dialog).getByRole("button", { name: "Family" }),
    ).toBeInTheDocument();
  });

  it("deletes a preset, moving focus to the next one", async () => {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([
        { name: "Family", players: ["Bob"] },
        { name: "Rivals", players: ["Carol"] },
      ]),
    );
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);

    const deleteFamily = within(dialog).getByRole("button", {
      name: "Delete Family",
    });
    await user.click(deleteFamily);
    await user.click(deleteFamily);

    expect(JSON.parse(localStorage.getItem(PRESETS_KEY) ?? "")).toEqual([
      { name: "Rivals", players: ["Carol"] },
    ]);
    expect(
      within(dialog).getByRole("button", { name: "Rivals" }),
    ).toHaveFocus();
  });

  it("says when no preset is saved, and why none can be yet", async () => {
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);

    expect(within(dialog).getByText("No saved presets")).toBeInTheDocument();
    const save = within(dialog).getByRole("button", {
      name: "Create Preset",
    });
    expect(save).toBeDisabled();
    expect(save).toHaveAccessibleDescription("Choose a player first");
  });

  it("creates no preset past the most it keeps, but still updates one", async () => {
    localStorage.setItem(COMPARED_PLAYERS_KEY, JSON.stringify(["Alice"]));
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify(
        Array.from({ length: MAX_PRESETS }, (_, index) => ({
          name: `P${index}`,
          players: ["Bob"],
        })),
      ),
    );
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);
    const field = within(dialog).getByRole("textbox", { name: "Preset Name" });

    await user.type(field, "New");
    const create = within(dialog).getByRole("button", {
      name: "Create Preset",
    });
    expect(create).toBeDisabled();
    expect(create).toHaveAccessibleDescription(
      "Delete a preset to save another",
    );
    await user.clear(field);
    await user.type(field, "p0");
    expect(
      within(dialog).getByRole("button", { name: "Update Preset" }),
    ).toBeEnabled();
  });

  it("saves no preset without a name, and gives no reason", async () => {
    localStorage.setItem(COMPARED_PLAYERS_KEY, JSON.stringify(["Alice"]));
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);

    const save = within(dialog).getByRole("button", {
      name: "Create Preset",
    });
    expect(save).toBeDisabled();
    expect(save).not.toHaveAccessibleDescription();
    await user.type(
      within(dialog).getByRole("textbox", { name: "Preset Name" }),
      "Mine",
    );
    expect(save).toBeEnabled();
  });

  it("takes no more of a name than a preset holds", async () => {
    localStorage.setItem(
      PRESETS_KEY,
      JSON.stringify([{ name: "Family", players: ["Bob"] }]),
    );
    const user = mountApp(COMPARE_PATH);
    const dialog = await openPresets(user);
    const long = "A".repeat(MAX_PRESET_NAME + 4);

    const field = within(dialog).getByRole("textbox", { name: "Preset Name" });
    await user.type(field, long);
    expect(field).toHaveValue(long.slice(0, MAX_PRESET_NAME));

    await user.click(
      within(dialog).getByRole("button", { name: "Rename Family" }),
    );
    const draft = within(dialog).getByRole("textbox", {
      name: "New name for Family",
    });
    await user.clear(draft);
    await user.type(draft, long);
    expect(draft).toHaveValue(long.slice(0, MAX_PRESET_NAME));
  });
});
