import { MockedFunction } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { League, LeagueInfo } from "./types/League";

vi.mock("./utils/getLeagueInfo");
vi.mock("./utils/readFileToBuffer");
vi.mock("./utils/scoring/getPlayerScores");
vi.mock("./utils/buildSpreadsheetBuffer");

import {
  CURRENT_WEEK,
  SEASON,
  leagueInfo,
  getLeagueInfoMock,
  getPlayerScoresMock,
  readFileToBufferMock,
  mountApp,
  mountLoadedApp,
  fileInput,
  uploadSpreadsheet,
  notFoundResponse,
  htmlResponse,
  spreadsheetResponse,
  routedFetch,
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

describe("the app, first load", () => {
  it("asks ESPN for the pro league calendar", async () => {
    await mountLoadedApp();
    expect(getLeagueInfoMock).toHaveBeenCalledWith(League.PRO, undefined);
  });

  it("hides the controls until the week lookup resolves", () => {
    let resolve: (info: LeagueInfo) => void = () => undefined;
    getLeagueInfoMock.mockReturnValue(
      new Promise<LeagueInfo>((r) => {
        resolve = r;
      }),
    );
    mountApp();
    expect(screen.queryByText("Use Local Spreadsheet")).not.toBeInTheDocument();
    resolve(leagueInfo);
  });

  it("defaults to the active week", async () => {
    await mountLoadedApp();
    expect(screen.getByRole("combobox", { name: "Week" })).toHaveTextContent(
      `Week ${CURRENT_WEEK}`,
    );
  });

  it("opens on the newest week with picks, not the week ESPN has reached", async () => {
    global.fetch = routedFetch(notFoundResponse, [SEASON, SEASON - 1], {
      [SEASON]: [1],
    });
    await mountLoadedApp();
    expect(screen.getByRole("combobox", { name: "Week" })).toHaveTextContent(
      "Week 1",
    );
  });

  it("still offers the weeks past the newest one with picks", async () => {
    global.fetch = routedFetch(notFoundResponse, [SEASON, SEASON - 1], {
      [SEASON]: [1],
    });
    const user = await mountLoadedApp();
    await user.click(screen.getByRole("combobox", { name: "Week" }));
    const options = (await screen.findAllByRole("option")).map(
      (option) => option.textContent,
    );
    expect(options).toEqual(["Week 3", "Week 2", "Week 1"]);
  });

  it("offers only weeks up to the current one, newest first", async () => {
    const user = await mountLoadedApp();
    await user.click(screen.getByRole("combobox", { name: "Week" }));
    // The popup lands in a portal a frame after the click, so this has to wait
    // for it. Reading it synchronously passed most of the time and not always.
    const options = (await screen.findAllByRole("option")).map(
      (option) => option.textContent,
    );
    expect(options).toEqual(["Week 3", "Week 2", "Week 1"]);
  });

  it("offers the seasons that have picks, and opens on the current one", async () => {
    global.fetch = routedFetch(notFoundResponse);
    const user = await mountLoadedApp();
    expect(screen.getByRole("combobox", { name: "Season" })).toHaveTextContent(
      `${SEASON} Season`,
    );

    await user.click(screen.getByRole("combobox", { name: "Season" }));
    const options = (await screen.findAllByRole("option")).map(
      (option) => option.textContent,
    );
    expect(options).toEqual([`${SEASON} Season`, `${SEASON - 1} Season`]);
  });

  it("opens on the newest season with picks, not the one ESPN calls current", async () => {
    getLeagueInfoMock.mockImplementation(async (_league, season) => ({
      ...leagueInfo,
      season: season ?? SEASON,
    }));
    global.fetch = routedFetch(notFoundResponse, [SEASON - 1, SEASON - 2]);
    await mountLoadedApp();

    expect(screen.getByRole("combobox", { name: "Season" })).toHaveTextContent(
      `${SEASON - 1} Season`,
    );
    // The season running now is looked up, so it can be offered below, but the
    // calendar that gets fetched and scored is the one opened on.
    expect(getLeagueInfoMock).toHaveBeenCalledWith(League.PRO, SEASON - 1);
  });

  it("offers the season running now even before it has any picks", async () => {
    // ESPN answers with whichever season was asked for, and with the one running
    // now when asked for none. That season has no picks in this list.
    getLeagueInfoMock.mockImplementation(async (_league, season) => ({
      ...leagueInfo,
      season: season ?? SEASON,
    }));
    global.fetch = routedFetch(notFoundResponse, [SEASON - 1, SEASON - 2]);
    const user = await mountLoadedApp();

    await user.click(screen.getByRole("combobox", { name: "Season" }));
    const options = (await screen.findAllByRole("option")).map(
      (option) => option.textContent,
    );
    expect(options).toEqual([
      `${SEASON} Season`,
      `${SEASON - 1} Season`,
      `${SEASON - 2} Season`,
    ]);
  });

  it("leaves out the season running now until its opener has been played", async () => {
    // ESPN moves on to the next season as soon as the last one ends, months
    // before anything is played. Asked for no season it answers with that one,
    // which has no week behind it and so nothing anybody could score.
    getLeagueInfoMock.mockImplementation(async (_league, season) =>
      season == null
        ? { ...leagueInfo, season: SEASON + 1, activeWeek: undefined }
        : { ...leagueInfo, season },
    );
    global.fetch = routedFetch(notFoundResponse, [SEASON, SEASON - 1]);
    const user = await mountLoadedApp();

    await user.click(screen.getByRole("combobox", { name: "Season" }));
    const options = (await screen.findAllByRole("option")).map(
      (option) => option.textContent,
    );
    expect(options).toEqual([`${SEASON} Season`, `${SEASON - 1} Season`]);
  });

  it("offers no weeks of a season whose opener is still ahead", async () => {
    getLeagueInfoMock.mockResolvedValue({
      ...leagueInfo,
      activeWeek: undefined,
    });
    await mountLoadedApp();

    // Nothing selected, and nothing to select: the trigger is left asking for a
    // week it has none of.
    expect(screen.getByRole("combobox", { name: "Week" })).toHaveTextContent(
      "Select a week...",
    );
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("offers the current season alone when the list cannot be had", async () => {
    const user = await mountLoadedApp();

    await user.click(screen.getByRole("combobox", { name: "Season" }));
    const options = (await screen.findAllByRole("option")).map(
      (option) => option.textContent,
    );
    expect(options).toEqual([`${SEASON} Season`]);
  });

  it("asks ESPN for the season the user picked", async () => {
    global.fetch = routedFetch(notFoundResponse);
    const user = await mountLoadedApp();

    await user.click(screen.getByRole("combobox", { name: "Season" }));
    await user.click(
      await screen.findByRole("option", { name: `${SEASON - 1} Season` }),
    );

    await waitFor(() => {
      expect(getLeagueInfoMock).toHaveBeenCalledWith(League.PRO, SEASON - 1);
    });
  });

  it("names the app on the logo and again as the page's own heading", async () => {
    await mountLoadedApp();
    // The heading is visually hidden, so this is what a screen reader is told
    // the page is, not a second copy of the wordmark on screen.
    // Matched whole rather than by substring, so the unlit segments drawn over
    // the name have to stay out of the button's accessible name to pass.
    expect(
      screen.getByRole("button", { name: "Rakulator" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Rakulator" }),
    ).toBeInTheDocument();
  });

  it("opens a newly picked season on that season's current week", async () => {
    getLeagueInfoMock.mockImplementation(async (_league, season) => ({
      ...leagueInfo,
      season: season ?? SEASON,
    }));
    global.fetch = routedFetch(spreadsheetResponse, [SEASON, SEASON - 1]);
    // Arrive on week 1, so the week the URL asked for is not the current one.
    const user = mountApp(`/${SEASON}/1/scoreboard`);
    await screen.findByText("MNF Points Pick");

    await user.click(document.querySelector(".logo-button") as HTMLElement);
    await user.click(screen.getByRole("combobox", { name: "Season" }));
    await user.click(
      await screen.findByRole("option", { name: `${SEASON - 1} Season` }),
    );

    // The week that URL named belongs to the season it named, not to this one.
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Week" })).toHaveTextContent(
        `Week ${CURRENT_WEEK}`,
      );
    });
  });

  it("keeps the schedule it has when only the week changes", async () => {
    fetchMock.mockResolvedValue(spreadsheetResponse());
    const user = mountApp(`/${SEASON}/${CURRENT_WEEK}/scoreboard`);
    await screen.findByText("MNF Points Pick");
    const lookups = getLeagueInfoMock.mock.calls.length;

    // Home, then back to another week of the same season.
    await user.click(document.querySelector(".logo-button") as HTMLElement);
    await user.click(screen.getByRole("combobox", { name: "Week" }));
    await user.click(await screen.findByRole("option", { name: "Week 1" }));
    await user.click(screen.getByText("View Results"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`/api/picks/${SEASON}/1`);
    });
    // The season did not change, so neither did its calendar.
    expect(getLeagueInfoMock).toHaveBeenCalledTimes(lookups);
  });
});

describe("the app, automatic picks fetch", () => {
  it("asks the API for the selected week's picks", async () => {
    await mountLoadedApp();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/picks/${SEASON}/${CURRENT_WEEK}`,
      );
    });
  });

  it("invites a local spreadsheet when the API has no picks", async () => {
    fetchMock.mockResolvedValue(notFoundResponse());
    await mountLoadedApp();
    await waitFor(() => {
      expect(screen.getByText("Missing Picks")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        `The picks spreadsheet for week ${CURRENT_WEEK} is not yet in the database, but you can use a local spreadsheet if you have one.`,
      ),
    ).toBeInTheDocument();
  });

  it("ignores a response that is not a spreadsheet", async () => {
    // A bare dev server answers this path with the app's own HTML at 200.
    fetchMock.mockResolvedValue(htmlResponse());
    await mountLoadedApp();
    await waitFor(() => {
      expect(screen.getByText("Missing Picks")).toBeInTheDocument();
    });
    expect(getPlayerScoresMock).not.toHaveBeenCalled();
  });

  it("scores the picks the API returns", async () => {
    fetchMock.mockResolvedValue(spreadsheetResponse());
    await mountLoadedApp();
    await waitFor(() => {
      expect(getPlayerScoresMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("View Results")).toBeEnabled();
  });

  it("scores nothing and offers nothing when no picks were fetched", async () => {
    await mountLoadedApp();
    await waitFor(() => {
      expect(screen.getByText("Missing Picks")).toBeInTheDocument();
    });
    expect(getPlayerScoresMock).not.toHaveBeenCalled();
    expect(screen.getByText("View Results")).toBeDisabled();
    expect(screen.getByText("Export Results")).toBeDisabled();
  });

  it("re-fetches when the week changes", async () => {
    const user = await mountLoadedApp();
    await waitFor(() => {
      expect(screen.getByText("Missing Picks")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("combobox", { name: "Week" }));
    // Base UI mounts the popup in a portal, so the options arrive a tick later.
    await user.click(await screen.findByRole("option", { name: "Week 1" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "The picks spreadsheet for week 1 is not yet in the database, but you can use a local spreadsheet if you have one.",
        ),
      ).toBeInTheDocument();
    });
  });
});

describe("the app, manual spreadsheet upload", () => {
  it("scores the uploaded file for the selected week", async () => {
    const user = await mountLoadedApp();
    await uploadSpreadsheet(user);
    await waitFor(() => {
      expect(getPlayerScoresMock).toHaveBeenCalledTimes(1);
    });
    expect(getPlayerScoresMock.mock.calls[0][0]).toEqual(week(CURRENT_WEEK));
  });

  it("confirms success with a toast", async () => {
    const user = await mountLoadedApp();
    await uploadSpreadsheet(user);
    await waitFor(() => {
      expect(
        screen.getByText("Generated results from picks spreadsheet"),
      ).toBeInTheDocument();
    });
  });

  it("enables the results buttons once scores exist", async () => {
    const user = await mountLoadedApp();
    await uploadSpreadsheet(user);
    await waitFor(() => {
      expect(screen.getByText("View Results")).toBeEnabled();
    });
    expect(screen.getByText("Export Results")).toBeEnabled();
  });

  it("reports a toast when the spreadsheet cannot be scored", async () => {
    getPlayerScoresMock.mockRejectedValue(new Error("not a spreadsheet"));
    const user = await mountLoadedApp();
    await uploadSpreadsheet(user);
    await waitFor(() => {
      expect(
        screen.getByText(
          "Failed to read picks from the spreadsheet you selected.",
        ),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("View Results")).toBeDisabled();
  });

  it("reports a toast when the file itself cannot be read", async () => {
    readFileToBufferMock.mockRejectedValue(new Error("unreadable"));
    const user = await mountLoadedApp();
    await uploadSpreadsheet(user);
    await waitFor(() => {
      expect(
        screen.getByText(
          "Failed to read picks from the spreadsheet you selected.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("reports an aborted selection when no file is chosen", async () => {
    await mountLoadedApp();
    // userEvent.upload with an empty list fires no change event, which is what
    // a canceled file dialog looks like to the DOM. Fire it directly.
    fireEvent.change(fileInput(), { target: { files: [] } });
    await waitFor(() => {
      expect(
        screen.getByText("Aborted picks spreadsheet selection"),
      ).toBeInTheDocument();
    });
    expect(getPlayerScoresMock).not.toHaveBeenCalled();
  });
});
