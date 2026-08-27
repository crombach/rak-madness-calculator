import {
  render,
  screen,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { League } from "../../types/League";
import { LeagueResult } from "../../types/LeagueResult";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import { WeekGame } from "../../types/WeekGame";
import {
  finalGame,
  liveGame,
  upcomingGame as upcomingGameFixture,
} from "../../utils/scoring/leagueResultFixtures";
import { POLL_MS } from "../../hooks/useLiveGame";

vi.mock("../../utils/getLeagueResults");

import { gamesMatching } from "./GameStatusDialog";
import {
  dialog,
  getGameResultMock,
  SEASON,
  WEEK,
} from "./gameStatusDialogTestSupport";

/**
 * The shared fixtures build a game ESPN's own boxscore never quite is: no id
 * beyond a shared placeholder, and a team known only by its abbreviation. Real
 * boxscore fields, distinct per game, so the fetch a game is asked about by and
 * the name and logo it renders can be told apart on screen.
 */
function withEspnDetails(built: LeagueResult, id: string): LeagueResult {
  const withDetails = (side: LeagueResult["home"]): LeagueResult["home"] => ({
    ...side,
    team: {
      ...side.team,
      name: `${side.team.abbreviation} Team`,
      logoUrl: `https://espn.com/${side.team.abbreviation}.png`,
    },
  });
  return {
    ...built,
    id,
    home: withDetails(built.home),
    away: withDetails(built.away),
  };
}

/** The pro game is live, and the college one finished a while ago. */
const proGame = withEspnDetails(
  liveGame({ home: "BUF", away: "KC", homeScore: 7, awayScore: 0 }),
  "401",
);
const collegeGame = withEspnDetails(
  finalGame({ home: "OSU", away: "MICH", homeScore: 20, awayScore: 30 }),
  "402",
);
const upcomingGame = withEspnDetails(
  upcomingGameFixture({ home: "PHI", away: "DAL" }),
  "403",
);

const games: Array<WeekGame> = [
  {
    label: "C1",
    league: League.COLLEGE,
    name: collegeGame.shortName,
    result: collegeGame,
  },
  // A column ESPN listed no game for, which is a game the dialog can only report as
  // missing.
  {
    label: "C2",
    league: League.COLLEGE,
    name: "PSU / IOWA",
  },
  {
    label: "P1",
    league: League.PRO,
    name: proGame.shortName,
    result: proGame,
  },
  {
    label: "P2",
    league: League.PRO,
    name: upcomingGame.shortName,
    result: upcomingGame,
  },
];

const scores: RakMadnessScores = { scores: [], games };

/** A promise the case decides when to answer, so a fetch can be left in flight. */
function deferred() {
  let settle: (value: LeagueResult | null) => void = () => undefined;
  const promise = new Promise<LeagueResult | null>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
}

describe("gamesMatching", () => {
  it("offers every game before anything is typed, in column order", () => {
    expect(gamesMatching(games, "").map((it) => it.label)).toEqual([
      "C1",
      "C2",
      "P1",
      "P2",
    ]);
  });

  it("finds a game by either team", () => {
    expect(gamesMatching(games, "mich").map((it) => it.label)).toEqual(["C1"]);
    expect(gamesMatching(games, "buf").map((it) => it.label)).toEqual(["P1"]);
  });

  it("finds a game by the column it is in, which is what a cell said", () => {
    expect(gamesMatching(games, "P1").map((it) => it.label)).toEqual(["P1"]);
  });

  it("has nothing to offer before a week is scored", () => {
    expect(gamesMatching([], "")).toEqual([]);
  });
});

/*
 * One mounted dialog for the whole file, on purpose: Base UI leaves its scroll lock
 * and focus guards behind, which put a second dialog's search out of reach. What
 * each game reads like is covered against `GameStatusSummary` instead.
 */
describe("GameStatusDialog", () => {
  it("fetches the open game, keeps it up to date, and stops when it is final", async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    getGameResultMock.mockResolvedValue(proGame);

    // Closed, so there is nothing to watch and nothing is asked for.
    const { rerender } = render(dialog(undefined, false, scores));
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);
    expect(getGameResultMock).not.toHaveBeenCalled();

    // Opened on a cell in the pro column.
    rerender(dialog("P1", true, scores));
    expect(getGameResultMock).toHaveBeenCalledWith(
      League.PRO,
      WEEK,
      "401",
      SEASON,
    );
    expect(
      screen.getByRole("progressbar", { name: "Fetching the game" }),
    ).toHaveAttribute("aria-busy", "true");

    // Every mark the week could draw, asked for before any game is opened, so a
    // scoreline never comes up and then fills in.
    expect(
      [
        ...document.head.querySelectorAll('link[rel="prefetch"][as="image"]'),
      ].map((link) => link.getAttribute("href")),
    ).toEqual([
      "https://espn.com/OSU.png",
      "https://espn.com/MICH.png",
      "https://espn.com/BUF.png",
      "https://espn.com/KC.png",
      "https://espn.com/PHI.png",
      "https://espn.com/DAL.png",
    ]);

    // The game, not the column the cell that opened it was in, and the week's own
    // copy of it already up rather than a wait for the fetch that is out.
    expect(screen.getByRole("combobox", { name: "Game" })).toHaveValue(
      "KC @ BUF",
    );
    expect(screen.getByText("BUF Team")).toBeInTheDocument();
    // In words as well as in a dot, a red dot alone reading as a decoration.
    expect(screen.getByRole("img", { name: "Live" })).toHaveTextContent("LIVE");

    // The score the fetch came back with, in place of the one the week was scored at.
    await waitForElementToBeRemoved(() => screen.queryByRole("progressbar"));
    expect(screen.getByText("8:42 - 3rd Quarter")).toBeInTheDocument();
    expect(screen.getByText("BUF Team")).toBeInTheDocument();

    // Ten seconds on, the same game is asked about again, and the answer replaces
    // what was on screen.
    getGameResultMock.mockResolvedValue(
      withEspnDetails(
        liveGame({ home: "BUF", away: "KC", homeScore: 14, awayScore: 7 }),
        "401",
      ),
    );
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(getGameResultMock).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("14")).toBeInTheDocument();

    // A poll says it is out the way a first fetch does, and the game already on
    // screen stays up behind the bar.
    const held = deferred();
    getGameResultMock.mockReturnValue(held.promise);
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(
      await screen.findByRole("progressbar", { name: "Fetching the game" }),
    ).toBeInTheDocument();
    expect(screen.getByText("BUF Team")).toBeInTheDocument();

    held.settle(proGame);
    expect(await screen.findByText("0")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).toBeNull();

    // Another game chosen from the search. The one on screen stays there behind the
    // bar until the new one arrives, rather than the dialog emptying and filling.
    const pending = deferred();
    getGameResultMock.mockReturnValue(pending.promise);
    await user.click(screen.getByRole("combobox", { name: "Game" }));

    // Every entry says where its game stands: the live game LIVE, the one that is
    // over a tick, the one yet to start a calendar, and the column ESPN has no game
    // for a warning.
    await screen.findByRole("option", { name: /KC @ BUF/ });

    // Under the search, whatever room is left below it, so the list never covers the
    // game the dialog is already open on.
    expect(screen.getByRole("listbox").closest("[data-side]")).toHaveAttribute(
      "data-side",
      "bottom",
    );

    expect(
      screen.getAllByRole("option").map((option) =>
        within(option)
          .getAllByRole("img")
          .map((mark) => mark.getAttribute("aria-label")),
      ),
    ).toEqual([
      ["Final"],
      ["Not listed by ESPN"],
      ["Live"],
      ["Yet to kick off"],
    ]);
    expect(
      within(screen.getByRole("option", { name: /DAL @ PHI/ })).getByTestId(
        "EventIcon",
      ),
    ).toBeInTheDocument();
    // Every mark says its state in a word beside its shape.
    expect(screen.getAllByRole("img").map((mark) => mark.textContent)).toEqual([
      "DONE",
      "WARN",
      "LIVE",
      "SOON",
    ]);

    await user.click(screen.getByRole("option", { name: /DAL @ PHI/ }));

    // Choosing ends the search, so a phone's keyboard comes down off the game that
    // was just asked for. The dialog holds the focus rather than nothing.
    expect(screen.getByRole("combobox", { name: "Game" })).not.toHaveFocus();
    expect(document.activeElement).toHaveClass("dialog__popup");

    expect(getGameResultMock).toHaveBeenLastCalledWith(
      League.PRO,
      WEEK,
      "403",
      SEASON,
    );
    expect(
      screen.getByRole("progressbar", { name: "Fetching the game" }),
    ).toBeInTheDocument();
    // The game being switched to, from the week's own copy of it, rather than the
    // live one whose result is still the last one fetched.
    expect(screen.queryByText("BUF Team")).toBeNull();
    expect(screen.getByText("PHI Team")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Yet to kick off" }),
    ).toBeInTheDocument();

    pending.settle(upcomingGame);
    await waitForElementToBeRemoved(() => screen.queryByRole("progressbar"));
    expect(screen.getByText("PHI Team")).toBeInTheDocument();
    // Not started, so the search says so rather than that there is something to watch.
    expect(screen.queryByRole("img", { name: /Live/ })).toBeNull();

    // A game the week was already scored on after it finished is shown as it was
    // scored, without being asked for at all. Nothing about it can have changed, and
    // there is nothing left to poll for either.
    const askedBeforeFinal = getGameResultMock.mock.calls.length;
    await user.click(screen.getByRole("combobox", { name: "Game" }));
    await user.click(await screen.findByRole("option", { name: /MICH @ OSU/ }));
    expect(screen.getByText("OSU Team")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByRole("img", { name: "Final" })).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(POLL_MS * 3);
    expect(getGameResultMock).toHaveBeenCalledTimes(askedBeforeFinal);

    // The same switch made with the last game's fetch still outstanding. The answer
    // lands after the switch, and the finished game stays where it is.
    const stray = deferred();
    getGameResultMock.mockReturnValue(stray.promise);
    await user.click(screen.getByRole("combobox", { name: "Game" }));
    await user.click(await screen.findByRole("option", { name: /KC @ BUF/ }));
    expect(
      screen.getByRole("progressbar", { name: "Fetching the game" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Game" }));
    await user.click(await screen.findByRole("option", { name: /MICH @ OSU/ }));
    expect(screen.getByText("OSU Team")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).toBeNull();

    stray.settle(proGame);
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(screen.getByText("OSU Team")).toBeInTheDocument();
    expect(screen.queryByText("BUF Team")).toBeNull();

    // Back on the live game, which is asked about again on the way in.
    getGameResultMock.mockResolvedValue(proGame);
    await user.click(screen.getByRole("combobox", { name: "Game" }));
    await user.click(await screen.findByRole("option", { name: /KC @ BUF/ }));
    expect(await screen.findByText("BUF Team")).toBeInTheDocument();

    // Closing takes the watch off it, whatever the game is doing.
    rerender(dialog("P1", false, scores));
    const askedByClose = getGameResultMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(POLL_MS * 3);
    expect(getGameResultMock).toHaveBeenCalledTimes(askedByClose);

    vi.useRealTimers();
  });
});
