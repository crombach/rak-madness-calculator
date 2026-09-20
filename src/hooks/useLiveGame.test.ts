import { act, renderHook } from "@testing-library/react";
import { GameStatus } from "../types/ESPN";
import { League } from "../types/League";
import { WeekGame } from "../types/WeekGame";
import {
  liveGame,
  upcomingGame,
  weekOf,
} from "../utils/scoring/leagueResultFixtures";
import { LeagueResults } from "../utils/scoring/leagueResults";
import useLiveGame, { kickoffAt, POLL_MS } from "./useLiveGame";

const NOW = new Date("2024-10-06T12:00:00Z");
const HOUR_MS = 60 * 60 * 1000;

function poller() {
  return vi.fn<
    (leagues: ReadonlyArray<League>) => Promise<LeagueResults | undefined>
  >();
}

/** The fixture's own kickoff is fixed, so each case says where it sits from `NOW`. */
function kickoffIn(ms: number) {
  return {
    ...upcomingGame({ home: "BUF", away: "KC" }),
    date: new Date(NOW.getTime() + ms),
  };
}

describe("kickoffAt", () => {
  it("holds the kickoff of a game that has not started", () => {
    expect(kickoffAt(kickoffIn(2 * HOUR_MS))).toBe(NOW.getTime() + 2 * HOUR_MS);
  });

  it("holds a kickoff already past, which ESPN still calls upcoming", () => {
    expect(kickoffAt(kickoffIn(-HOUR_MS))).toBe(NOW.getTime() - HOUR_MS);
  });

  it("holds nothing for a kickoff date ESPN gave nothing to parse", () => {
    const result = {
      ...upcomingGame({ home: "BUF", away: "KC" }),
      date: new Date("not a date"),
    };
    expect(kickoffAt(result)).toBeNull();
  });

  it("holds nothing for a game being played, whatever its kickoff says", () => {
    const result = liveGame({
      home: "BUF",
      away: "KC",
      homeScore: 7,
      awayScore: 0,
    });
    expect(kickoffAt(result)).toBeNull();
  });

  it("holds nothing when nothing answered, since the next list may hold it", () => {
    expect(kickoffAt(null)).toBeNull();
  });
});

describe("useLiveGame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks once about a game that has not kicked off, then nothing until kickoff", async () => {
    const result = kickoffIn(2 * HOUR_MS);
    const onPoll = poller();
    onPoll.mockResolvedValue(weekOf("pro", result));
    const game: WeekGame = {
      label: "P1",
      league: League.PRO,
      name: "KC @ BUF",
      result,
    };

    const games = [game];
    renderHook(() => useLiveGame({ open: true, game, games, onPoll }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(onPoll).toHaveBeenCalledTimes(1);

    // The 20 second poll would have asked four more times over this minute.
    await act(() => vi.advanceTimersByTimeAsync(POLL_MS * 4));
    expect(onPoll).toHaveBeenCalledTimes(1);

    onPoll.mockResolvedValue(
      weekOf(
        "pro",
        liveGame({ home: "BUF", away: "KC", homeScore: 0, awayScore: 0 }),
      ),
    );
    await act(() => vi.advanceTimersByTimeAsync(2 * HOUR_MS - POLL_MS * 4));
    expect(onPoll).toHaveBeenCalledTimes(2);

    // Kicked off, so it is back on the poll.
    await act(() => vi.advanceTimersByTimeAsync(POLL_MS));
    expect(onPoll).toHaveBeenCalledTimes(3);
  });

  it("names the watched game's league, which is the one fetch the poll costs", async () => {
    const result = kickoffIn(2 * HOUR_MS);
    const onPoll = poller();
    onPoll.mockResolvedValue(weekOf("pro", result));
    const game: WeekGame = {
      label: "P1",
      league: League.PRO,
      name: "KC @ BUF",
      result,
    };

    renderHook(() => useLiveGame({ open: true, game, games: [game], onPoll }));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(onPoll).toHaveBeenCalledWith([League.PRO]);
  });

  it("hands back the game the fetch answered with", async () => {
    const result = kickoffIn(2 * HOUR_MS);
    const onPoll = poller();
    onPoll.mockResolvedValue(weekOf("pro", result));
    const game: WeekGame = {
      label: "P1",
      league: League.PRO,
      name: "KC @ BUF",
      result,
    };

    const games = [game];
    const { result: hook } = renderHook(() =>
      useLiveGame({ open: true, game, games, onPoll }),
    );
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(hook.current.shown?.status).toBe(GameStatus.UPCOMING);
  });

  it("hands back nothing where a pass in flight turned the poll away", async () => {
    const result = liveGame({
      home: "BUF",
      away: "KC",
      homeScore: 7,
      awayScore: 0,
    });
    const onPoll = poller();
    onPoll.mockResolvedValue(undefined);
    const game: WeekGame = {
      label: "P1",
      league: League.PRO,
      name: "KC @ BUF",
      result,
    };

    const { result: hook } = renderHook(() =>
      useLiveGame({ open: true, game, games: [game], onPoll }),
    );
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(hook.current.shown).toBeUndefined();
    // Still on the poll, so the next tick asks again.
    await act(() => vi.advanceTimersByTimeAsync(POLL_MS));
    expect(onPoll).toHaveBeenCalledTimes(2);
  });

  it("stays on the poll while the week is away", async () => {
    // A failed refresh drops the scores, so the week can go out from under a
    // tick. The week is no longer in the effect's deps, so a tick that stopped
    // here would stay stopped until the dialog was opened again.
    const result = liveGame({
      home: "BUF",
      away: "KC",
      homeScore: 7,
      awayScore: 0,
    });
    const onPoll = poller();
    onPoll.mockResolvedValue(weekOf("pro", result));
    const game: WeekGame = {
      label: "P1",
      league: League.PRO,
      name: "KC @ BUF",
      result,
    };

    const { rerender } = renderHook(
      ({ games }: { games?: Array<WeekGame> }) =>
        useLiveGame({ open: true, game, games, onPoll }),
      { initialProps: { games: [game] as Array<WeekGame> | undefined } },
    );
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(onPoll).toHaveBeenCalledTimes(1);

    rerender({ games: undefined });
    await act(() => vi.advanceTimersByTimeAsync(POLL_MS));
    expect(onPoll).toHaveBeenCalledTimes(2);

    await act(() => vi.advanceTimersByTimeAsync(POLL_MS));
    expect(onPoll).toHaveBeenCalledTimes(3);
  });
});
