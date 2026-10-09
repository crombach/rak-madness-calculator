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
  mountApp,
  mountLoadedApp,
  spreadsheetResponse,
  uploadSpreadsheet,
  resultsCaption,
  setUpAppTest,
} from "./appTestFixtures";
import { RESULTS_PAGE } from "./components/results/resultsPath";
import { League } from "./types/League";
import {
  pick,
  player,
  week as scoredWeek,
} from "./utils/scoring/scoringTestFixtures";

let fetchMock: ReturnType<typeof setUpAppTest>;

beforeEach(() => {
  fetchMock = setUpAppTest();
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

  it("names the view and the week in the caption", async () => {
    const user = await mountWithScores();
    await user.click(screen.getByText("View Results"));

    const week = `${SEASON} Season • Week ${CURRENT_WEEK}`;
    expect(resultsCaption()).toHaveTextContent(`Scoreboard • ${week}`);

    await user.click(screen.getByRole("button", { name: "Picks" }));
    expect(resultsCaption()).toHaveTextContent(`Picks • ${week}`);
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
    expect(
      document.querySelector(".scores-nav__live .navbar__divider"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(getPlayerScoresMock).toHaveBeenCalledTimes(2);
    });
    // A refresh that worked says nothing. The rescored table is the whole of the
    // answer, so a toast over it would only repeat what it shows.
    // A toast still playing its exit is inert, and no longer counts.
    expect(
      document.querySelector(".toast-slot:not([data-leaving]) .toast"),
    ).not.toBeInTheDocument();
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

/** Level on points, so P1 decides the week and the knockouts page has a game. */
function knockoutWeek() {
  const scored = scoredWeek([
    player({ name: "Alice", total: 5, pro: [pick("KC -3")] }),
    player({ name: "Bob", total: 5, pro: [pick("DEN 3")] }),
  ]);
  scored.games = [{ label: "P1", league: League.PRO, name: "KC at DEN" }];
  return scored;
}

describe("the app, one navbar and one results caption", () => {
  it("keeps one navbar from home through the results pages and back", async () => {
    getPlayerScoresMock.mockResolvedValue(knockoutWeek());
    const user = await mountWithScores();
    const navbar = document.querySelector(".navbar");
    expect(navbar).toBeInTheDocument();
    expect(resultsCaption()).not.toBeInTheDocument();

    await user.click(screen.getByText("View Results"));
    await screen.findByText("MNF Points Pick");
    expect(document.querySelector(".navbar")).toBe(navbar);
    const caption = resultsCaption();
    expect(caption).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Picks" }));
    await screen.findByText("College Score");
    expect(document.querySelector(".navbar")).toBe(navbar);
    expect(resultsCaption()).toBe(caption);

    for (const page of [RESULTS_PAGE.knockouts, RESULTS_PAGE.games]) {
      await user.click(screen.getByRole("button", { name: "Menu" }));
      await user.click(await screen.findByRole("menuitem", { name: page }));
      await waitFor(() =>
        expect(resultsCaption()).toHaveTextContent(`${page} • `),
      );
      expect(resultsCaption()).toBe(caption);
      expect(document.querySelector(".navbar")).toBe(navbar);
    }

    await user.click(document.querySelector(".logo-button") as HTMLElement);
    await screen.findByText("Use Local Spreadsheet");
    expect(document.querySelector(".navbar")).toBe(navbar);
    expect(resultsCaption()).not.toBeInTheDocument();
  });
});

describe("the app, a week that fails to load", () => {
  it("offers a retry in place of the page, and scores the week on it", async () => {
    fetchMock.mockImplementation(async () => spreadsheetResponse());
    getPlayerScoresMock.mockRejectedValueOnce(new Error("ESPN is down"));
    const user = mountApp(`/${SEASON}/${CURRENT_WEEK}/scoreboard`);

    const retry = await screen.findByRole("button", { name: "Retry" });
    // Once in the toast and once in the page's place.
    expect(
      screen.getAllByText(
        `Failed to calculate scores for week ${CURRENT_WEEK}.`,
      ),
    ).toHaveLength(2);

    await user.click(retry);

    expect(await screen.findByText("MNF Points Pick")).toBeInTheDocument();
    expect(getPlayerScoresMock).toHaveBeenCalledTimes(2);
  });

  it("offers the home page beside the retry", async () => {
    fetchMock.mockImplementation(async () => spreadsheetResponse());
    getPlayerScoresMock.mockRejectedValueOnce(new Error("ESPN is down"));
    const user = mountApp(`/${SEASON}/${CURRENT_WEEK}/scoreboard`);

    await user.click(await screen.findByRole("button", { name: "Home" }));

    expect(await screen.findByText("View Results")).toBeInTheDocument();
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
        weekNumber: CURRENT_WEEK,
        // The workbook fills a name cell the way the tables do, and this fixture's
        // week is decided, which is told however the reader has the setting.
        showStatus: true,
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
