import { screen, waitFor } from "@testing-library/react";

vi.mock("./utils/getLeagueInfo");
vi.mock("./utils/readFileToBuffer");
vi.mock("./utils/scoring/getPlayerScores");
vi.mock("./utils/buildSpreadsheetBuffer");

import {
  CURRENT_WEEK,
  SEASON,
  scores,
  openWeekScores,
  getPlayerScoresMock,
  buildSpreadsheetBufferMock,
  mountLoadedApp,
  uploadSpreadsheet,
  resultsCaption,
  setUpAppTest,
} from "./appTestFixtures";

beforeEach(() => {
  setUpAppTest();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** A loaded app with a spreadsheet already scored, its buttons enabled. */
async function mountWithScores(buttonName = "View Results") {
  const user = await mountLoadedApp();
  await uploadSpreadsheet(user);
  await waitFor(() => {
    expect(screen.getByText(buttonName)).toBeEnabled();
  });
  return user;
}

describe("the app, results views", () => {
  it("opens the scoreboard view", async () => {
    const user = await mountWithScores();
    await user.click(screen.getByText("View Results"));
    expect(screen.getByText("MNF Points Pick")).toBeInTheDocument();
    expect(screen.queryByText("Use Local Spreadsheet")).not.toBeInTheDocument();
  });

  it("switches to the picks view and back, marking the one you are on", async () => {
    const user = await mountWithScores();
    await user.click(screen.getByText("View Results"));

    const scoreboard = screen.getByRole("button", { name: "Scoreboard" });
    const picks = screen.getByRole("button", { name: "Picks" });
    expect(scoreboard).toHaveAttribute("aria-pressed", "true");
    expect(picks).toHaveAttribute("aria-pressed", "false");

    await user.click(picks);
    expect(screen.getByText("College Score")).toBeInTheDocument();
    expect(screen.queryByText("MNF Points Pick")).not.toBeInTheDocument();
    expect(picks).toHaveAttribute("aria-pressed", "true");
    expect(scoreboard).toHaveAttribute("aria-pressed", "false");

    await user.click(scoreboard);
    expect(screen.getByText("MNF Points Pick")).toBeInTheDocument();
    expect(scoreboard).toHaveAttribute("aria-pressed", "true");
  });

  // The navbar already marks which view you are on, so the caption names the week
  // and nothing else. Switching views must not change a word of it.
  it("names the same week across both views", async () => {
    const user = await mountWithScores();
    await user.click(screen.getByText("View Results"));

    const expected = `Rak Madness · ${SEASON} Season · Week ${CURRENT_WEEK}`;
    expect(resultsCaption()).toHaveTextContent(expected);

    await user.click(screen.getByRole("button", { name: "Picks" }));
    expect(resultsCaption()).toHaveTextContent(expected);
  });

  it("returns home from the logo button", async () => {
    const user = await mountWithScores();
    await user.click(screen.getByText("View Results"));
    const logo = document.querySelector(".logo-button") as HTMLElement;
    await user.click(logo);
    expect(screen.getByText("Use Local Spreadsheet")).toBeInTheDocument();
  });

  it("recalculates on refresh", async () => {
    getPlayerScoresMock.mockResolvedValue(openWeekScores);
    const user = await mountWithScores();
    await user.click(screen.getByText("View Results"));
    expect(getPlayerScoresMock).toHaveBeenCalledTimes(1);

    // A week with a game still to play is what puts Refresh on screen at all.
    expect(document.querySelector(".scores-nav__divider")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(getPlayerScoresMock).toHaveBeenCalledTimes(2);
    });
    // A refresh that worked says nothing. The rescored table is the whole of the
    // answer, so a toast over it would only repeat what it shows.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("reports a scoring failure instead of crashing", async () => {
    getPlayerScoresMock.mockResolvedValue(openWeekScores);
    const user = await mountWithScores();
    await user.click(screen.getByText("View Results"));
    getPlayerScoresMock.mockRejectedValueOnce(new Error("bad spreadsheet"));

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          `Failed to calculate scores for week ${CURRENT_WEEK}.`,
        ),
      ).toBeInTheDocument();
    });
    // A refresh reuses the workbook already in memory, so a transient failure has
    // nothing to fall back to but what was already on screen.
    expect(screen.getByText("MNF Points Pick")).toBeInTheDocument();
  });
});

describe("the app, export", () => {
  it("builds and downloads a spreadsheet for the selected week", async () => {
    const user = await mountWithScores("Export Results");

    const click = vi.spyOn(HTMLAnchorElement.prototype, "click");
    await user.click(screen.getByText("Export Results"));

    await waitFor(() => {
      expect(buildSpreadsheetBufferMock).toHaveBeenCalledWith(scores, {
        season: SEASON,
        week: CURRENT_WEEK,
      });
    });
    expect(click).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(
        screen.getByText("Exported results spreadsheet"),
      ).toBeInTheDocument();
    });
  });
});
