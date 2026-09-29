import { screen, waitFor } from "@testing-library/react";

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
import { EXPERIMENTAL_FEATURES_KEY } from "../../context/SettingsContext";
import { pick, player, week } from "../../utils/scoring/scoringTestFixtures";

const GAMES_PATH = `/${SEASON}/${CURRENT_WEEK}/games`;

beforeEach(() => {
  setUpAppTest().mockResolvedValue(spreadsheetResponse());
  getPlayerScoresMock.mockResolvedValue(
    week([player({ name: "Alice", pro: [pick("KC -3")] })]),
  );
  localStorage.setItem(EXPERIMENTAL_FEATURES_KEY, "on");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the games route", () => {
  it("names the page", async () => {
    mountApp(GAMES_PATH);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: `${SEASON} Week ${CURRENT_WEEK} Games`,
      }),
    ).toBeInTheDocument();
  });

  it("offers no refresh, since the page polls on its own", async () => {
    const user = mountApp(`/${SEASON}/${CURRENT_WEEK}/scoreboard`);
    expect(
      await screen.findByRole("button", { name: "Refresh" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(await screen.findByText("Games"));
    await screen.findByRole("heading", {
      level: 1,
      name: `${SEASON} Week ${CURRENT_WEEK} Games`,
    });

    // Faded out over `COLLAPSE_DURATION_MS` before it unmounts.
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Refresh" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("stays on the page once every game is settled", async () => {
    getPlayerScoresMock.mockResolvedValue(
      week([player({ name: "Alice", pro: [pick("KC -3", "yes")] })], 42),
    );
    mountApp(GAMES_PATH);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: `${SEASON} Week ${CURRENT_WEEK} Games`,
      }),
    ).toBeInTheDocument();
  });

  it("sends the old live path to the games page", async () => {
    mountApp(`/${SEASON}/${CURRENT_WEEK}/live`);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: `${SEASON} Week ${CURRENT_WEEK} Games`,
      }),
    ).toBeInTheDocument();
  });

  it("sends a reader without experimental features to the scoreboard", async () => {
    localStorage.removeItem(EXPERIMENTAL_FEATURES_KEY);
    mountApp(GAMES_PATH);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: `${SEASON} Week ${CURRENT_WEEK} Scoreboard`,
      }),
    ).toBeInTheDocument();
  });
});
