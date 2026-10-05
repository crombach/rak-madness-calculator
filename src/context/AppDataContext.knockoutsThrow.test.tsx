import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../utils/getLeagueInfo");
vi.mock("../utils/readFileToBuffer");
vi.mock("../utils/scoring/getPlayerScores");
vi.mock("../utils/buildSpreadsheetBuffer");
// A week the knockouts cannot read.
vi.mock("../utils/scoring/getKnockouts", () => ({
  default: () => {
    throw new Error("unreadable week");
  },
}));

import {
  CURRENT_WEEK,
  SEASON,
  getPlayerScoresMock,
  mountApp,
  setUpAppTest,
  spreadsheetResponse,
} from "../appTestFixtures";
import { pick, player, week } from "../utils/scoring/scoringTestFixtures";

beforeEach(() => {
  setUpAppTest().mockResolvedValue(spreadsheetResponse());
  getPlayerScoresMock.mockResolvedValue(
    week([
      player({ name: "Alice", total: 5, pro: [pick("KC -3")] }),
      player({ name: "Bob", total: 5, pro: [pick("DEN 3")] }),
    ]),
  );
});

it("keeps the scoreboard up when the knockouts throw", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  mountApp(`/${SEASON}/${CURRENT_WEEK}`);

  await vi.waitFor(() =>
    expect(warn).toHaveBeenCalledWith(
      "Could not work out the knockouts",
      expect.any(Error),
    ),
  );
  expect(
    screen.getByRole("heading", {
      level: 1,
      name: `${SEASON} Week ${CURRENT_WEEK} Scoreboard`,
    }),
  ).toBeInTheDocument();
});

it("says in the menu that the knockouts could not load when they throw", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const user = userEvent.setup();
  mountApp(`/${SEASON}/${CURRENT_WEEK}`);

  await user.click(await screen.findByRole("button", { name: "Menu" }));

  expect(
    await screen.findByRole("menuitem", { name: /Knockouts/ }),
  ).toHaveAccessibleDescription("Knockouts could not load");
});

it("sends a direct link to Knockouts to the scoreboard when the knockouts throw", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  mountApp(`/${SEASON}/${CURRENT_WEEK}/knockouts`);

  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: `${SEASON} Week ${CURRENT_WEEK} Scoreboard`,
    }),
  ).toBeInTheDocument();
});
