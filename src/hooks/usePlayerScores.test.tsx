import { act, renderHook, waitFor } from "@testing-library/react";
import { PropsWithChildren } from "react";
import { MockedFunction } from "vitest";
import { ToastContextProvider } from "../context/ToastContext";
import { notFoundResponse, spreadsheetResponse } from "../responseTestFixtures";
import { WeekInfo } from "../types/League";
import { RakMadnessScores } from "../types/RakMadnessScores";
import { writeCachedPicks } from "../utils/picksCache";
import { getPlayerScores } from "../utils/scoring/getPlayerScores";
import { SEASON, week } from "../weekFixtures";
import usePlayerScores from "./usePlayerScores";

vi.mock("../utils/scoring/getPlayerScores", () => ({
  getPlayerScores: vi.fn(),
}));

const getPlayerScoresMock = getPlayerScores as MockedFunction<
  typeof getPlayerScores
>;

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

function wrapper({ children }: PropsWithChildren<object>) {
  return <ToastContextProvider>{children}</ToastContextProvider>;
}

beforeEach(() => {
  localStorage.clear();
  // A fresh Response per call, because a body can only be read once.
  global.fetch = vi.fn(async () =>
    Promise.resolve(spreadsheetResponse()),
  ) as unknown as typeof fetch;
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
  it("does not re-fetch the picks spreadsheet", async () => {
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
    expect(global.fetch).toHaveBeenCalledTimes(fetchCallsBeforeRefresh);
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
});
