import { screen, waitFor, within } from "@testing-library/react";

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
import { COMPARED_PLAYERS_KEY, GAME_SCOPE_KEY } from "./comparedPlayers";

const COMPARE_PATH = `/${SEASON}/${CURRENT_WEEK}/compare`;

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
 * it itself when fewer than two players come back from last time.
 */
async function openDialog(user: ReturnType<typeof mountApp>) {
  const opener = await waitFor(
    () =>
      screen.queryByRole("dialog") ??
      screen.getByRole("button", { name: "Choose Players" }),
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

  it("opens on the pickers, with no picks, until two players are chosen", async () => {
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
    for (const remove of screen.getAllByRole("button", { name: /Remove/ })) {
      expect(remove).toBeDisabled();
    }
  });

  it("focuses the picker Add Player makes", async () => {
    const user = mountApp(COMPARE_PATH);
    await openDialog(user);
    await user.click(await screen.findByRole("button", { name: "Add Player" }));

    expect(screen.getByRole("combobox", { name: "Player 3" })).toHaveFocus();
  });

  it("hides Add Player once every player has a picker", async () => {
    const user = mountApp(COMPARE_PATH);
    await openDialog(user);

    await user.click(await screen.findByRole("button", { name: "Add Player" }));

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

    for (let added = 0; added < 8; added++) {
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

  it("keeps saved players this week lacks until the reader chooses", async () => {
    const saved = JSON.stringify(["Gone", "Alice", "Missing"]);
    localStorage.setItem(COMPARED_PLAYERS_KEY, saved);
    await openDialog(mountApp(COMPARE_PATH));

    expect(
      await screen.findByRole("combobox", { name: "Player 1" }),
    ).toHaveValue("Alice");
    expect(localStorage.getItem(COMPARED_PLAYERS_KEY)).toBe(saved);
  });

  it("opens on the saved players the week still has", async () => {
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Bob", "Gone", "Alice", "Carol"]),
    );
    await openDialog(mountApp(COMPARE_PATH));

    expect(
      await screen.findByRole("combobox", { name: "Player 1" }),
    ).toHaveValue("Bob");
    expect(screen.getByRole("combobox", { name: "Player 2" })).toHaveValue(
      "Alice",
    );
    expect(screen.getByRole("combobox", { name: "Player 3" })).toHaveValue(
      "Carol",
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
