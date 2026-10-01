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
  resultsCaption,
  setUpAppTest,
  spreadsheetResponse,
} from "../../appTestFixtures";
import { EXPERIMENTAL_FEATURES_KEY } from "../../context/SettingsContext";
import { League } from "../../types/League";
import { pick, player, week } from "../../utils/scoring/scoringTestFixtures";
import { PAGES, RESULTS_PAGE, ResultsPage, weekName } from "./resultsPath";

/** Level on points, so P1 decides the week and the swing games page has a game. */
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
  localStorage.setItem(EXPERIMENTAL_FEATURES_KEY, "on");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the results caption", () => {
  it.each(Object.values(RESULTS_PAGE))(
    "names the week and %s",
    async (page) => {
      const path = `/${SEASON}/${CURRENT_WEEK}/${PAGES[page as ResultsPage].segment}`;
      mountApp(path);

      await waitFor(() =>
        expect(resultsCaption()).toHaveTextContent(
          `${page} • ${weekName(SEASON, CURRENT_WEEK)}`,
        ),
      );
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(page);
    },
  );
});
