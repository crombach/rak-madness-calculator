import { useNavigate } from "react-router";
import { screen } from "@testing-library/react";

vi.mock("../../utils/getLeagueInfo");
vi.mock("../../utils/readFileToBuffer");
vi.mock("../../utils/scoring/getPlayerScores");
vi.mock("../../utils/buildSpreadsheetBuffer");
// The knockouts' own code, failing its first download only, as on a flaky network.
const downloads = vi.hoisted(() => ({ count: 0 }));
vi.mock("../../utils/scoring/getKnockouts", async (importOriginal) => {
  downloads.count += 1;
  if (downloads.count === 1) throw new Error("network gone");
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
import { League } from "../../types/League";
import { pick, player, week } from "../../utils/scoring/scoringTestFixtures";

function OpenKnockouts() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/${SEASON}/${CURRENT_WEEK}/knockouts`)}
    >
      Open Knockouts
    </button>
  );
}

beforeEach(() => {
  setUpAppTest().mockResolvedValue(spreadsheetResponse());
  const scores = week([
    player({ name: "Alice", total: 5, pro: [pick("KC -3")] }),
    player({ name: "Bob", total: 5, pro: [pick("DEN 3")] }),
  ]);
  scores.games = [{ label: "P1", league: League.PRO, name: "KC at DEN" }];
  getPlayerScoresMock.mockResolvedValue(scores);
});

it("shows the knockouts once the page's own download lands after a failed one", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const user = mountApp(`/${SEASON}/${CURRENT_WEEK}`, {
    beside: <OpenKnockouts />,
  });
  await vi.waitFor(() =>
    expect(warn).toHaveBeenCalledWith(
      "Could not load the knockouts",
      expect.any(Error),
    ),
  );

  await user.click(screen.getByRole("button", { name: "Open Knockouts" }));

  expect(await screen.findByText("KC at DEN")).toBeInTheDocument();
});
