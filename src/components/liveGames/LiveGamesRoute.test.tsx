import { screen } from "@testing-library/react";

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

const LIVE_PATH = `/${SEASON}/${CURRENT_WEEK}/live`;

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

describe("the live games route", () => {
  it("names the page", async () => {
    mountApp(LIVE_PATH);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: `${SEASON} Week ${CURRENT_WEEK} Live Games`,
      }),
    ).toBeInTheDocument();
  });

  it("sends a reader without experimental features to the scoreboard", async () => {
    localStorage.removeItem(EXPERIMENTAL_FEATURES_KEY);
    mountApp(LIVE_PATH);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: `${SEASON} Week ${CURRENT_WEEK} Scoreboard`,
      }),
    ).toBeInTheDocument();
  });
});
