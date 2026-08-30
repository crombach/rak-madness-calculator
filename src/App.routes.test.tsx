import { MockedFunction } from "vitest";
import { screen, waitFor } from "@testing-library/react";

vi.mock("./utils/getLeagueInfo");
vi.mock("./utils/readFileToBuffer");
vi.mock("./utils/scoring/getPlayerScores");
vi.mock("./utils/buildSpreadsheetBuffer");

import {
  CURRENT_WEEK,
  SEASON,
  getPlayerScoresMock,
  mountApp,
  mountLoadedApp,
  resultsCaption,
  scoresHeaderButtons,
  spreadsheetResponse,
  setUpAppTest,
  week,
} from "./appTestFixtures";

let fetchMock: MockedFunction<typeof fetch>;

beforeEach(() => {
  fetchMock = setUpAppTest();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Mounts a route with the spreadsheet fetch already stubbed, same as every case below needs. */
function mountScoreboard(path: string) {
  fetchMock.mockResolvedValue(spreadsheetResponse());
  return mountApp(path);
}

// The guard's own branches are `hooks/useWeekRouteGuard.test.tsx`, the wireframe's
// shape is `table/SkeletonTable.test.tsx`, and the bare-URL redirect is
// `results/CurrentWeekRedirect.test.tsx`. What is left is the wiring between them.
describe("the app: the URL decides which week is fetched, and what shows while it is", () => {
  it("shows a wireframe table until the results are ready", async () => {
    mountScoreboard(`/${SEASON}/${CURRENT_WEEK}/scoreboard`);

    expect(document.querySelector(".table.--skeleton")).toBeInTheDocument();

    await screen.findByText("MNF Points Pick");
    expect(document.querySelector(".table.--skeleton")).not.toBeInTheDocument();
  });

  it("shows every navbar button unavailable while the week loads", async () => {
    mountScoreboard(`/${SEASON}/${CURRENT_WEEK}/scoreboard`);

    // Scoreboard, picks, and refresh. `aria-disabled`, not `disabled`: they keep
    // their place in the tab order while there is nothing to switch between.
    const loading = scoresHeaderButtons();
    expect(loading).toHaveLength(3);
    loading.forEach((button) =>
      expect(button).toHaveAttribute("aria-disabled", "true"),
    );

    await screen.findByText("MNF Points Pick");
    scoresHeaderButtons().forEach((button) =>
      expect(button).not.toHaveAttribute("aria-disabled"),
    );
  });

  it("holds the content still while the week loads, keeping the scrollbar's room", async () => {
    mountScoreboard(`/${SEASON}/${CURRENT_WEEK}/picks`);

    expect(document.querySelector(".page__content")).toHaveClass("--frozen");

    await screen.findByText("College Score");
    expect(document.querySelector(".page__content")).not.toHaveClass(
      "--frozen",
    );
  });

  it("opens a week's picks from its URL", async () => {
    await mountScoreboard(`/${SEASON}/${CURRENT_WEEK}/picks`);

    expect(await screen.findByText("College Score")).toBeInTheDocument();
  });

  it("scores the week named in the URL, not the current one", async () => {
    await mountScoreboard(`/${SEASON}/1/scoreboard`);

    await waitFor(() => {
      expect(getPlayerScoresMock).toHaveBeenCalled();
    });
    expect(getPlayerScoresMock.mock.calls[0][0]).toEqual(week(1));
  });

  it("scores the week named in the URL exactly once", async () => {
    await mountScoreboard(`/${SEASON}/${CURRENT_WEEK}/scoreboard`);
    await screen.findByText("MNF Points Pick");

    expect(getPlayerScoresMock).toHaveBeenCalledTimes(1);
  });

  it("scores the season named in the URL", async () => {
    await mountScoreboard(`/${SEASON}/${CURRENT_WEEK}/scoreboard`);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/picks/${SEASON}/${CURRENT_WEEK}`,
      );
    });
  });

  it("shows the scoreboard for a bare week URL", async () => {
    await mountScoreboard(`/${SEASON}/${CURRENT_WEEK}`);

    expect(await screen.findByText("MNF Points Pick")).toBeInTheDocument();
  });

  // The week is in the URL before the scores are worked out, so the caption the
  // wireframe wears is the one the table keeps. Nothing under it moves. Also the
  // only case naming the season and week over the table at all: the picks route
  // renders the same caption through the same shared `ResultsFrame`.
  it("names the week over the wireframe, and does not change when the scores land", async () => {
    mountScoreboard(`/${SEASON}/${CURRENT_WEEK}/scoreboard`);

    const expected = `Rak Madness · ${SEASON} Season · Week ${CURRENT_WEEK}`;
    expect(resultsCaption()).toHaveTextContent(expected);

    await screen.findByText("MNF Points Pick");
    expect(resultsCaption()).toHaveTextContent(expected);
  });

  // `getByText` reads a hidden node, so the attribute is what has to be asserted.
  it("says the week on screen without saying it twice", async () => {
    await mountScoreboard(`/${SEASON}/${CURRENT_WEEK}/scoreboard`);
    await screen.findByText("MNF Points Pick");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: `${SEASON} Week ${CURRENT_WEEK} Scoreboard`,
      }),
    ).toBeInTheDocument();
    expect(resultsCaption()).toHaveAttribute("aria-hidden", "true");
  });

  it("sends an unknown path home", async () => {
    await mountLoadedApp("/nonsense");

    expect(screen.getByText("Use Local Spreadsheet")).toBeInTheDocument();
  });

  it("opens the settings over the home page, from the footer", async () => {
    const user = mountApp("/");
    await user.click(await screen.findByRole("button", { name: "Settings" }));

    expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument();
    expect(screen.getByLabelText("Player Name")).toBeInTheDocument();
  });
});
