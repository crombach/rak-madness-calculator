import { screen, within } from "@testing-library/react";

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
import { COMPARED_PLAYERS_KEY } from "./comparedPlayers";

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

async function choose(
  user: ReturnType<typeof mountApp>,
  picker: string,
  name: string,
) {
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

  it("asks for two players before showing any picks", async () => {
    mountApp(COMPARE_PATH);

    expect(
      await screen.findByText("Pick two players to compare"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("starts on the reader's own player", async () => {
    localStorage.setItem(PLAYER_NAME_KEY, "carol");
    mountApp(COMPARE_PATH);

    expect(
      await screen.findByRole("combobox", { name: "Player 1" }),
    ).toHaveValue("Carol");
  });

  it("shows only the games two players picked differently", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");

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
      "MNF Points Pick",
      "MNF Points Distance",
      "C2",
      "College Score",
      "P1",
      "Pro Score",
      "Pro Score ATS",
      "Total Score",
    ]);
    expect(screen.getByRole("combobox", { name: "Player 2" })).toHaveValue(
      "Carol",
    );
  });

  it("shows each player's MNF points pick among the tiebreakers", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");

    const table = await screen.findByRole("table");
    expect(within(table).getByRole("cell", { name: "45" })).toBeInTheDocument();
    expect(within(table).getByRole("cell", { name: "38" })).toBeInTheDocument();
  });

  it("keeps each player's rank in the whole week", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");

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

    expect(
      await screen.findByText("They picked every game the same"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the open games first and the decided ones on request", async () => {
    getPlayerScoresMock.mockResolvedValue(
      week([
        player({
          name: "Cal",
          total: 1,
          pro: [pick("KC", "yes"), pick("SF")],
        }),
        player({ name: "Dee", pro: [pick("DEN", "no"), pick("LAR")] }),
      ]),
    );
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Cal");
    await choose(user, "Player 2", "Dee");
    const headers = () =>
      within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((header) => header.textContent);

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(headers()).not.toContain("P1");
    expect(headers()).toContain("P2");

    await user.click(screen.getByRole("button", { name: "Show more" }));

    expect(headers()).toContain("P1");
    expect(headers()).toContain("P2");
  });

  it("shows every game once the reader picks All", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");

    await user.click(screen.getByRole("button", { name: "All" }));

    const table = await screen.findByRole("table", {
      name: "Picks of Alice and Carol",
    });
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers).toEqual(expect.arrayContaining(["C1", "C2", "P1", "P2"]));
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("adds a third player to the table", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");
    await user.click(screen.getByRole("button", { name: "Add player" }));
    await choose(user, "Player 3", "Bob");

    expect(
      await screen.findByRole("table", {
        name: "Picks where Alice, Carol, and Bob differ",
      }),
    ).toBeInTheDocument();
  });

  it("removes a player, keeping the others in their pickers", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Alice");
    await choose(user, "Player 2", "Carol");
    await user.click(screen.getByRole("button", { name: "Add player" }));
    await choose(user, "Player 3", "Bob");

    await user.click(screen.getByRole("button", { name: "Remove Player 2" }));

    expect(screen.getByRole("combobox", { name: "Player 1" })).toHaveValue(
      "Alice",
    );
    expect(screen.getByRole("combobox", { name: "Player 2" })).toHaveValue(
      "Bob",
    );
    expect(
      screen.queryByRole("button", { name: /Remove/ }),
    ).not.toBeInTheDocument();
  });

  it("disables Add player once every player has a picker", async () => {
    const user = mountApp(COMPARE_PATH);
    const add = await screen.findByRole("button", { name: "Add player" });

    await user.click(add);

    expect(add).toBeDisabled();
  });

  it("stops at eight players", async () => {
    getPlayerScoresMock.mockResolvedValue(
      week(
        Array.from({ length: 10 }, (_, index) =>
          player({ name: `Player ${String.fromCharCode(65 + index)}` }),
        ),
      ),
    );
    const user = mountApp(COMPARE_PATH);
    const add = await screen.findByRole("button", { name: "Add player" });

    for (let added = 0; added < 6; added++) await user.click(add);

    expect(screen.getAllByRole("combobox")).toHaveLength(8);
    expect(add).toBeDisabled();
  });

  it("saves the chosen players and opens on them next time", async () => {
    const user = mountApp(COMPARE_PATH);
    await choose(user, "Player 1", "Carol");
    await choose(user, "Player 2", "Alice");

    expect(
      JSON.parse(localStorage.getItem(COMPARED_PLAYERS_KEY) ?? ""),
    ).toEqual(["Carol", "Alice"]);
  });

  it("opens on the saved players the week still has", async () => {
    localStorage.setItem(
      COMPARED_PLAYERS_KEY,
      JSON.stringify(["Bob", "Gone", "Alice", "Carol"]),
    );
    mountApp(COMPARE_PATH);

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
