import { screen } from "@testing-library/react";

vi.mock("../../utils/getLeagueInfo");
vi.mock("../../utils/readFileToBuffer");
vi.mock("../../utils/scoring/getPlayerScores");
vi.mock("../../utils/buildSpreadsheetBuffer");
// The knockouts' own code, failing to download, as after a deploy replaced it.
vi.mock("../../utils/scoring/getKnockouts", () => {
  throw new Error("chunk gone");
});

import {
  CURRENT_WEEK,
  SEASON,
  getPlayerScoresMock,
  mountApp,
  setUpAppTest,
  spreadsheetResponse,
} from "../../appTestFixtures";
import { EXPERIMENTAL_FEATURES_KEY } from "../../context/SettingsContext";
import { League } from "../../types/League";
import { pick, player, week } from "../../utils/scoring/scoringTestFixtures";

beforeEach(() => {
  setUpAppTest().mockResolvedValue(spreadsheetResponse());
  localStorage.setItem(EXPERIMENTAL_FEATURES_KEY, "on");
  const scores = week([
    player({ name: "Alice", total: 5, pro: [pick("KC -3")] }),
    player({ name: "Bob", total: 5, pro: [pick("DEN 3")] }),
  ]);
  scores.games = [{ label: "P1", league: League.PRO, name: "KC at DEN" }];
  getPlayerScoresMock.mockResolvedValue(scores);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

it("mounts the page when the knockouts' code fails, so a poll can ask again", async () => {
  mountApp(`/${SEASON}/${CURRENT_WEEK}/knockouts`);

  expect(
    await screen.findByRole("heading", { level: 1, name: /Knockouts/ }),
  ).toBeInTheDocument();
  await vi.waitFor(() =>
    expect(document.querySelector(".knockouts.--loading")).toBeNull(),
  );
});
