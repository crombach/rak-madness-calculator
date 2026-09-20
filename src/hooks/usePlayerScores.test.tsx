import { act, renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { MockedFunction } from "vitest";
import { ToastContextProvider } from "../context/ToastContext";
import { notFoundResponse, spreadsheetResponse } from "../responseTestFixtures";
import { League, WeekInfo } from "../types/League";
import { RakMadnessScores, Status } from "../types/RakMadnessScores";
import { writeCachedPicks } from "../utils/picksCache";
import { getPlayerScores } from "../utils/scoring/getPlayerScores";
import { liveGame, weekOf } from "../utils/scoring/leagueResultFixtures";
import { fetchLeagueResults } from "../utils/scoring/leagueResults";
import { SEASON, week } from "../weekFixtures";
import usePlayerScores from "./usePlayerScores";

vi.mock("../utils/scoring/getPlayerScores", () => ({
  getPlayerScores: vi.fn(),
}));

// `fetchLeagueResults` alone. `hasMoved` stays real, since what the gate does with
// an answer is half of what these cases are about.
vi.mock("../utils/scoring/leagueResults", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../utils/scoring/leagueResults")>()),
  fetchLeagueResults: vi.fn(),
}));

const getPlayerScoresMock = getPlayerScores as MockedFunction<
  typeof getPlayerScores
>;

const fetchLeagueResultsMock = fetchLeagueResults as MockedFunction<
  typeof fetchLeagueResults
>;

/** A pro week whose one game has moved since the fetch before, in its score. */
function movedWeek(score: number) {
  return weekOf(
    "pro",
    liveGame({ home: "BUF", away: "KC", homeScore: score, awayScore: 0 }),
  );
}

/**
 * Held still, not built per render. `usePlayerScores` keys its scoring callback on
 * this object's identity, so a fresh one every render refires the effect behind it
 * and the test can no longer tell a stable hook from a looping one.
 */
const WEEK_5 = week(5);

function scoresFor(weekNumber: number): RakMadnessScores {
  return {
    tiebreaker: weekNumber,
    scores: [],
  };
}

/** One player whose one pick holds `status`, so a refresh can move it. */
function scoresWithPick(status: Status): RakMadnessScores {
  return {
    scores: [
      {
        id: "0",
        name: "Rip",
        score: { total: 0, college: 0, pro: 0, proAgainstTheSpread: 0 },
        tiebreaker: {},
        college: [],
        pro: [
          {
            pick: "BUF -7",
            status,
            explanation: { header: "P1", message: "" },
          },
        ],
        status: { hasNoPicks: false, isKnockedOut: false },
      },
    ],
  };
}

function wrapper({ children }: PropsWithChildren<object>) {
  return <ToastContextProvider>{children}</ToastContextProvider>;
}

beforeEach(() => {
  localStorage.clear();
  // A fresh Response per call, because a body can only be read once.
  global.fetch = vi.fn(async () =>
    Promise.resolve(spreadsheetResponse()),
  ) as unknown as typeof fetch;
  // A different score every fetch, so the move gate lets every pass through. The
  // gate itself is covered by the cases that pin this to one answer.
  let fetches = 0;
  fetchLeagueResultsMock.mockImplementation(async () => movedWeek(fetches++ * 7));
});

describe("usePlayerScores", () => {
  it("scores this browser's cached upload when the API has no picks", async () => {
    // What lets a results URL survive a reload after a local upload.
    writeCachedPicks(SEASON, 5, new ArrayBuffer(8));
    global.fetch = vi.fn(async () =>
      Promise.resolve(notFoundResponse()),
    ) as unknown as typeof fetch;
    getPlayerScoresMock.mockResolvedValue(scoresFor(5));

    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current.attemptedFor).toEqual({
        season: SEASON,
        weekNumber: 5,
      }),
    );
    expect(result.current.scores).toEqual(scoresFor(5));
  });

  it("gives up when the API has no picks and nothing is cached", async () => {
    global.fetch = vi.fn(async () =>
      Promise.resolve(notFoundResponse()),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });

    await waitFor(() =>
      expect(result.current.attemptedFor).toEqual({
        season: SEASON,
        weekNumber: 5,
      }),
    );
    expect(result.current.scores).toBeUndefined();
    expect(getPlayerScoresMock).not.toHaveBeenCalled();
  });

  it("names the season it attemptedFor, so the same week of another one waits", async () => {
    getPlayerScoresMock.mockImplementation(async (selectedWeek) =>
      scoresFor(selectedWeek.value),
    );

    const { result, rerender } = renderHook(
      ({ season }: { season: number }) => usePlayerScores(WEEK_5, season),
      { initialProps: { season: SEASON }, wrapper },
    );
    await waitFor(() =>
      expect(result.current.attemptedFor).toEqual({
        season: SEASON,
        weekNumber: 5,
      }),
    );

    // Week 5 of the season before. Same week number, different season, so the
    // scores on hand describe neither until this attempt finishes.
    rerender({ season: SEASON - 1 });
    expect(result.current.attemptedFor).toEqual({
      season: SEASON,
      weekNumber: 5,
    });

    await waitFor(() =>
      expect(result.current.attemptedFor).toEqual({
        season: SEASON - 1,
        weekNumber: 5,
      }),
    );
  });

  it("keeps the newer week's scores when an older run finishes last", async () => {
    let finishWeekOne: (scores: RakMadnessScores) => void = () => undefined;
    getPlayerScoresMock.mockImplementation(
      (selectedWeek) =>
        new Promise<RakMadnessScores>((resolve) => {
          if (selectedWeek.value === 1) {
            finishWeekOne = resolve;
          } else {
            resolve(scoresFor(selectedWeek.value));
          }
        }),
    );

    const { result, rerender } = renderHook(
      ({ selectedWeek }: { selectedWeek: WeekInfo }) =>
        usePlayerScores(selectedWeek, SEASON),
      { initialProps: { selectedWeek: week(1) }, wrapper },
    );

    // Week 2 supersedes week 1 while week 1 is still being scored.
    rerender({ selectedWeek: week(2) });
    await waitFor(() =>
      expect(result.current.attemptedFor?.weekNumber).toBe(2),
    );

    // Let week 1 finish and everything it queued run to the end.
    await act(async () => {
      finishWeekOne(scoresFor(1));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.attemptedFor).toEqual({
      season: SEASON,
      weekNumber: 2,
    });
    expect(result.current.scores?.tiebreaker).toBe(2);
  });
});

describe("usePlayerScores, refresh", () => {
  it("re-fetches the picks spreadsheet a reader asks to refresh", async () => {
    // The sheet is rewritten when it turns out to carry an error, so the reader
    // who asks is the one who has to be able to pick that up.
    getPlayerScoresMock.mockResolvedValue(scoresFor(5));
    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });
    await waitFor(() => expect(result.current.scores).toEqual(scoresFor(5)));
    const fetchCallsBeforeRefresh = (
      global.fetch as MockedFunction<typeof fetch>
    ).mock.calls.length;

    await act(async () => {
      await result.current.refresh();
    });

    expect(getPlayerScoresMock).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledTimes(fetchCallsBeforeRefresh + 1);
    expect(global.fetch).toHaveBeenLastCalledWith(
      `/api/picks/${SEASON}/${WEEK_5.value}`,
    );
  });

  it("leaves the sheet alone when a game is polled final", async () => {
    // Nobody asked for anything. A settled game rescores the workbook in hand,
    // and a sheet arriving under the reader is not what it means.
    getPlayerScoresMock.mockResolvedValue(scoresFor(5));
    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });
    await waitFor(() => expect(result.current.scores).toEqual(scoresFor(5)));
    const fetchCallsBefore = (global.fetch as MockedFunction<typeof fetch>).mock
      .calls.length;

    await act(async () => {
      await result.current.rescore();
    });

    expect(getPlayerScoresMock).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledTimes(fetchCallsBefore);
  });

  it("fetches only the league a poll named", async () => {
    getPlayerScoresMock.mockResolvedValue(scoresFor(5));
    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });
    await waitFor(() => expect(result.current.scores).toEqual(scoresFor(5)));

    await act(async () => {
      await result.current.rescore([League.PRO]);
    });

    expect(fetchLeagueResultsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ leagues: ["pro"] }),
    );
  });

  it("fetches both leagues for a refresh the reader asked for", async () => {
    getPlayerScoresMock.mockResolvedValue(scoresFor(5));
    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });
    await waitFor(() => expect(result.current.scores).toEqual(scoresFor(5)));

    await act(async () => {
      await result.current.refresh();
    });

    expect(fetchLeagueResultsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ leagues: ["college", "pro"] }),
    );
  });

  it("does not score, or turn the button, for a poll that finds nothing moved", async () => {
    // Twenty seconds of a game nobody is playing is most of a Sunday. Rescoring
    // it would spin the button over a table that cannot have changed.
    getPlayerScoresMock.mockResolvedValue(scoresFor(5));
    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });
    await waitFor(() => expect(result.current.scores).toEqual(scoresFor(5)));
    const scoringCallsBefore = getPlayerScoresMock.mock.calls.length;

    fetchLeagueResultsMock.mockResolvedValue(movedWeek(7));
    await act(async () => {
      // The first of these moves, since the pass before it fetched another score.
      await result.current.rescore([League.PRO]);
      await result.current.rescore([League.PRO]);
      await result.current.rescore([League.PRO]);
    });

    expect(getPlayerScoresMock).toHaveBeenCalledTimes(scoringCallsBefore + 1);
    expect(result.current.isRefreshing).toBe(false);
  });

  it("hands a poll back what it fetched, whether or not anything moved", async () => {
    // The dialog draws a clock and a down off this, and neither costs a rescore.
    getPlayerScoresMock.mockResolvedValue(scoresFor(5));
    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });
    await waitFor(() => expect(result.current.scores).toEqual(scoresFor(5)));

    const standing = movedWeek(7);
    fetchLeagueResultsMock.mockResolvedValue(standing);
    let first: unknown;
    let second: unknown;
    await act(async () => {
      first = await result.current.rescore([League.PRO]);
      second = await result.current.rescore([League.PRO]);
    });

    expect(first).toBe(standing);
    expect(second).toBe(standing);
  });

  it("scores a refresh the reader asked for even where no game moved", async () => {
    // The sheet is rewritten when it turns out to carry an error, so asking is how
    // a correction reaches a live week. No game has to move for that.
    getPlayerScoresMock.mockResolvedValue(scoresFor(5));
    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });
    await waitFor(() => expect(result.current.scores).toEqual(scoresFor(5)));

    fetchLeagueResultsMock.mockResolvedValue(movedWeek(7));
    await act(async () => {
      await result.current.refresh();
    });
    const scoringCallsBefore = getPlayerScoresMock.mock.calls.length;

    await act(async () => {
      await result.current.refresh();
    });

    expect(getPlayerScoresMock).toHaveBeenCalledTimes(scoringCallsBefore + 1);
  });

  it("keeps the button turning after the scores it asked for land", async () => {
    // A rescore of the workbook in hand answers in single milliseconds. Stopped
    // with the answer, the button would flash and read as a button that did
    // nothing, so it is held to `REFRESHING_FLOOR_MS` instead.
    getPlayerScoresMock.mockResolvedValue(scoresFor(5));
    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });
    await waitFor(() => expect(result.current.scores).toEqual(scoresFor(5)));

    let refreshing: Promise<void> | undefined;
    act(() => {
      refreshing = result.current.refresh();
    });
    // The scores go up as soon as they are worked out, and the button is still
    // turning behind them.
    await waitFor(() => expect(getPlayerScoresMock).toHaveBeenCalledTimes(2));
    expect(result.current.isRefreshing).toBe(true);

    await act(async () => {
      await refreshing;
    });

    expect(result.current.isRefreshing).toBe(false);
  });

  it("reads the sheet for a fetch that lands while a rescore is running", async () => {
    // A fetch fires on every release, whatever `isRefreshing` says, so it reaches
    // this while a game polled final is still rescoring. Nothing under the
    // controls holds a window of its own, so the fetch is not turned away by one.
    // The button is inert for that half second and never gets here.
    getPlayerScoresMock.mockResolvedValue(scoresFor(5));
    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });
    await waitFor(() => expect(result.current.scores).toEqual(scoresFor(5)));
    const fetchCallsBefore = (global.fetch as MockedFunction<typeof fetch>).mock
      .calls.length;

    await act(async () => {
      const polled = result.current.rescore();
      await result.current.refresh();
      await polled;
    });

    expect(global.fetch).toHaveBeenCalledTimes(fetchCallsBefore + 1);
    expect(global.fetch).toHaveBeenLastCalledWith(
      `/api/picks/${SEASON}/${WEEK_5.value}`,
    );
  });

  it("runs a rescore the pass in flight turned away", async () => {
    // A game goes final while a refresh is reading the sheet. The rescore yields
    // to that refresh, but a game is final once, so the poll never asks again. If
    // the refresh's own read of ESPN missed the final, nothing else would reach
    // the table before the reader refreshed by hand.
    getPlayerScoresMock.mockResolvedValue(scoresFor(5));
    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });
    await waitFor(() => expect(result.current.scores).toEqual(scoresFor(5)));
    const scoringCallsBefore = getPlayerScoresMock.mock.calls.length;

    let releaseSheet: () => void = () => {};
    global.fetch = vi.fn(
      async () =>
        new Promise((resolve) => {
          releaseSheet = () => resolve(spreadsheetResponse());
        }),
    ) as unknown as typeof fetch;

    let asked: Promise<unknown> | undefined;
    await act(async () => {
      asked = result.current.refresh();
      // Turned away, since the refresh holds the sheet open.
      await result.current.rescore();
    });
    expect(getPlayerScoresMock).toHaveBeenCalledTimes(scoringCallsBefore);

    await act(async () => {
      releaseSheet();
      await asked;
    });

    // The refresh scored once, and the rescore it turned away scored after it.
    await waitFor(() =>
      expect(getPlayerScoresMock).toHaveBeenCalledTimes(scoringCallsBefore + 2),
    );
  });

  it("keeps the button turning until the last pass over the week is done", async () => {
    // A rescore and a refresh can run together, and the rescore is far the
    // quicker of the two. Whichever finishes first must not stop the button on
    // behalf of the one still working, or the table changes with nothing saying
    // why.
    getPlayerScoresMock.mockResolvedValue(scoresFor(5));
    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });
    await waitFor(() => expect(result.current.scores).toEqual(scoresFor(5)));

    let releaseSheet: () => void = () => {};
    global.fetch = vi.fn(
      async () =>
        new Promise((resolve) => {
          releaseSheet = () => resolve(spreadsheetResponse());
        }),
    ) as unknown as typeof fetch;

    let passes: Promise<unknown> | undefined;
    await act(async () => {
      const polled = result.current.rescore();
      const asked = result.current.refresh();
      passes = Promise.all([polled, asked]);
      // Past the floor, so the rescue has settled and cleared whatever it owns.
      await polled;
    });

    expect(result.current.isRefreshing).toBe(true);

    await act(async () => {
      releaseSheet();
      await passes;
    });

    expect(result.current.isRefreshing).toBe(false);
  });

  it("stops the button when a superseded refresh's fetch fails", async () => {
    // The week moved out from under a refresh, and the fetch it left running
    // then threw. Nothing of that pass reaches the screen, but the button it
    // turned is still this hook's to stop.
    getPlayerScoresMock.mockResolvedValue(scoresFor(5));
    const { result, rerender } = renderHook(
      ({ selectedWeek }: { selectedWeek: WeekInfo }) =>
        usePlayerScores(selectedWeek, SEASON),
      { initialProps: { selectedWeek: WEEK_5 }, wrapper },
    );
    await waitFor(() => expect(result.current.scores).toEqual(scoresFor(5)));

    let failFetch: () => void = () => {};
    fetchLeagueResultsMock.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          failFetch = () => reject(new Error("ESPN is down"));
        }),
    );

    let asked: Promise<unknown> | undefined;
    await act(async () => {
      asked = result.current.refresh();
    });
    expect(result.current.isRefreshing).toBe(true);

    // The week moves first, so the failure below lands on a superseded pass.
    rerender({ selectedWeek: week(6) });
    await act(async () => {
      failFetch();
      await asked;
    });

    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
  });

  it("replaces a workbook the reader uploaded with the one in the database", async () => {
    // The uploaded sheet stands in until the week reaches the database. Once it
    // is there, it is the week's own, so a refresh takes it back.
    const uploaded = new ArrayBuffer(16);
    const upstream = new ArrayBuffer(8);
    getPlayerScoresMock.mockResolvedValue(scoresFor(5));
    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });
    await waitFor(() => expect(result.current.scores).toEqual(scoresFor(5)));

    await act(async () => {
      await result.current.scoreLocalFile(
        new File([uploaded], "picks.xlsx") as File,
      );
    });
    expect(getPlayerScoresMock).toHaveBeenLastCalledWith(
      WEEK_5,
      expect.objectContaining({ byteLength: uploaded.byteLength }),
      SEASON,
      expect.anything(),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(getPlayerScoresMock).toHaveBeenLastCalledWith(
      WEEK_5,
      expect.objectContaining({ byteLength: upstream.byteLength }),
      SEASON,
      expect.anything(),
    );
  });

  it("keeps the scores on screen when a refresh cannot reach the sheet", async () => {
    // The scores came from the same week and are still the best answer there is.
    getPlayerScoresMock.mockResolvedValue(scoresFor(5));
    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });
    await waitFor(() => expect(result.current.scores).toEqual(scoresFor(5)));

    localStorage.clear();
    global.fetch = vi.fn(async () =>
      Promise.reject(new Error("offline")),
    ) as unknown as typeof fetch;

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.scores).toEqual(scoresFor(5));
  });

  it("collapses two refreshes started together into one scoring pass", async () => {
    getPlayerScoresMock.mockResolvedValue(scoresFor(5));
    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });
    await waitFor(() => expect(result.current.scores).toEqual(scoresFor(5)));
    expect(getPlayerScoresMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      // Neither call is awaited before the next fires, the way two clicks in the
      // same tick would land.
      result.current.refresh();
      result.current.refresh();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(getPlayerScoresMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the scores on screen when a refresh's scoring throws", async () => {
    getPlayerScoresMock.mockResolvedValue(scoresFor(5));
    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });
    await waitFor(() => expect(result.current.scores).toEqual(scoresFor(5)));

    getPlayerScoresMock.mockRejectedValueOnce(new Error("espn down"));
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.scores).toEqual(scoresFor(5));
  });

  it("drops the score changes once the wipe that shows them has run", async () => {
    // A table mounted later reads these, and a wipe the reader already watched
    // would play again when they come back from the homepage.
    getPlayerScoresMock.mockResolvedValue(scoresWithPick("incomplete"));
    const { result } = renderHook(() => usePlayerScores(WEEK_5, SEASON), {
      wrapper,
    });
    await waitFor(() =>
      expect(result.current.scores).toEqual(scoresWithPick("incomplete")),
    );

    getPlayerScoresMock.mockResolvedValue(scoresWithPick("yes"));
    let refreshing: Promise<void> | undefined;
    act(() => {
      refreshing = result.current.refresh();
    });
    await waitFor(() => expect(result.current.scoreChanges.picks.size).toBe(1));

    await waitFor(() => expect(result.current.scoreChanges.picks.size).toBe(0));
    await act(async () => {
      await refreshing;
    });
  });
});
