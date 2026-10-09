import { screen, waitFor } from "@testing-library/react";

vi.mock("../../utils/getLeagueInfo");
vi.mock("../../utils/readFileToBuffer");
vi.mock("../../utils/scoring/getPlayerScores");
vi.mock("../../utils/buildSpreadsheetBuffer");

// Which chunks have been asked for. A module's factory runs on its first import
// only, so the cases below run in order and each builds on the one before.
const asked = vi.hoisted(() => new Set<string>());
vi.mock("../games/GamesRoute", async (importOriginal) => {
  asked.add("games");
  return importOriginal();
});
vi.mock("../knockouts/KnockoutsRoute", async (importOriginal) => {
  asked.add("knockouts");
  return importOriginal();
});
vi.mock("../playerAnalysis/PlayerAnalysisDialog", async (importOriginal) => {
  asked.add("playerAnalysis");
  return importOriginal();
});
vi.mock("../gameStatus/GameStatusDialog", async (importOriginal) => {
  asked.add("gameStatus");
  return importOriginal();
});

import {
  CURRENT_WEEK,
  SEASON,
  getPlayerScoresMock,
  mountApp,
  setUpAppTest,
  spreadsheetResponse,
} from "../../appTestFixtures";

const PATH = `/${SEASON}/${CURRENT_WEEK}/scoreboard`;

beforeEach(() => {
  setUpAppTest().mockResolvedValue(spreadsheetResponse());
});

it("fetches the Games page while the week is still loading, and no dialog", async () => {
  getPlayerScoresMock.mockReturnValue(new Promise(() => {}));
  mountApp(PATH);

  await waitFor(() => expect(asked).toContain("games"));
  await waitFor(() => expect(getPlayerScoresMock).toHaveBeenCalled());
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(asked).not.toContain("knockouts");
  expect(asked).not.toContain("playerAnalysis");
  expect(asked).not.toContain("gameStatus");
});

it("fetches the Knockouts page and both dialogs for a week that failed", async () => {
  getPlayerScoresMock.mockRejectedValue(new Error("ESPN is down"));
  mountApp(PATH);

  await screen.findByRole("button", { name: "Retry" });
  await waitFor(() => expect(asked).toContain("playerAnalysis"));
  expect(asked).toContain("gameStatus");
  expect(asked).toContain("knockouts");
});
