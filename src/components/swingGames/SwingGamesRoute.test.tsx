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
  scores as decidedScores,
  setUpAppTest,
  spreadsheetResponse,
} from "../../appTestFixtures";
import { League } from "../../types/League";
import { pick, player, week } from "../../utils/scoring/scoringTestFixtures";

const SWINGS_PATH = `/${SEASON}/${CURRENT_WEEK}/swings`;

/** Level on points, so each is out if their side of P1 misses. */
function swingScores() {
  const scores = week([
    player({ name: "Alice", total: 5, pro: [pick("KC -3")] }),
    player({ name: "Bob", total: 5, pro: [pick("DEN 3")] }),
  ]);
  scores.games = [{ label: "P1", league: League.PRO, name: "KC at DEN" }];
  return scores;
}

beforeEach(() => {
  setUpAppTest().mockResolvedValue(spreadsheetResponse());
  getPlayerScoresMock.mockResolvedValue(swingScores());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the swing games route", () => {
  it("names the page and marks neither view as selected", async () => {
    mountApp(SWINGS_PATH);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: `${SEASON} Week ${CURRENT_WEEK} Swing Games`,
      }),
    ).toBeInTheDocument();
    await screen.findByText("KC at DEN");
    expect(
      screen.getByText(`Swing Games · ${SEASON} Season · Week ${CURRENT_WEEK}`),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Scoreboard" })).toBeEnabled();
  });

  it("sets the menu off from the view buttons with a divider", async () => {
    mountApp(SWINGS_PATH);
    await screen.findByText("KC at DEN");

    const divider = screen.getByRole("button", {
      name: "Menu",
    }).previousElementSibling;
    expect(divider).toHaveClass("navbar__divider");
    expect(divider?.previousElementSibling).toContainElement(
      screen.getByRole("button", { name: "Picks" }),
    );
  });

  it("shows each side of a game with the players it knocks out", async () => {
    mountApp(SWINGS_PATH);

    const game = (await screen.findByText("KC at DEN")).closest("section");
    expect(game).not.toBeNull();
    const inGame = within(game as HTMLElement);
    expect(inGame.getByText("KC -3")).toBeInTheDocument();
    expect(inGame.getByText("DEN +3")).toBeInTheDocument();
    expect(inGame.getAllByText("Out if it misses:")).toHaveLength(2);
    expect(inGame.getByRole("button", { name: "Alice" })).toBeInTheDocument();
    expect(inGame.getByRole("button", { name: "Bob" })).toBeInTheDocument();
  });

  it("opens the player analysis from a player's name", async () => {
    const user = mountApp(SWINGS_PATH);

    await user.click(await screen.findByRole("button", { name: "Alice" }));

    const dialog = await screen.findByRole("dialog", {
      name: /Player Analysis/,
    });
    expect(within(dialog).getByRole("combobox")).toHaveValue("Alice");
  });

  it("opens the game status from a game's title", async () => {
    const user = mountApp(SWINGS_PATH);

    await user.click(await screen.findByRole("button", { name: "KC at DEN" }));

    expect(
      await screen.findByRole("dialog", { name: /Game Status/ }),
    ).toBeInTheDocument();
  });

  it("says a won week has a winner, with the way to the scoreboard", async () => {
    getPlayerScoresMock.mockResolvedValue(decidedScores);
    mountApp(SWINGS_PATH);

    expect(
      await screen.findByText("The week has a winner."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "See the scoreboard" }),
    ).toHaveAttribute("href", `/${SEASON}/${CURRENT_WEEK}/scoreboard`);
  });
});
