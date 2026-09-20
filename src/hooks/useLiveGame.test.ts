import { act, renderHook } from "@testing-library/react";
import { GameStatus } from "../types/ESPN";
import { League, WeekInfo } from "../types/League";
import { WeekGame } from "../types/WeekGame";
import { getLeagueWeekMock, weekOf } from "../utils/getLeagueWeekMock";
import { liveGame, upcomingGame } from "../utils/scoring/leagueResultFixtures";
import useLiveGame, { kickoffAt, POLL_MS } from "./useLiveGame";

vi.mock("../utils/getLeagueResults");

const NOW = new Date("2024-10-06T12:00:00Z");
const HOUR_MS = 60 * 60 * 1000;

const WEEK: WeekInfo = {
  value: 5,
  label: "Week 5",
  startDate: new Date("2024-10-01T00:00:00Z"),
  endDate: new Date("2024-10-08T00:00:00Z"),
};

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
    getLeagueWeekMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks once about a game that has not kicked off, then nothing until kickoff", async () => {
    const result = kickoffIn(2 * HOUR_MS);
    getLeagueWeekMock.mockResolvedValue(weekOf(result));
    const game: WeekGame = {
      label: "P1",
      league: League.PRO,
      name: "KC @ BUF",
      result,
    };

    const games = [game];
    renderHook(() => useLiveGame({ open: true, game, games, week: WEEK }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(getLeagueWeekMock).toHaveBeenCalledTimes(1);

    // The 15 second poll would have asked four more times over this minute.
    await act(() => vi.advanceTimersByTimeAsync(POLL_MS * 4));
    expect(getLeagueWeekMock).toHaveBeenCalledTimes(1);

    getLeagueWeekMock.mockResolvedValue(
      weekOf(liveGame({ home: "BUF", away: "KC", homeScore: 0, awayScore: 0 })),
    );
    await act(() => vi.advanceTimersByTimeAsync(2 * HOUR_MS - POLL_MS * 4));
    expect(getLeagueWeekMock).toHaveBeenCalledTimes(2);

    // Kicked off, so it is back on the poll.
    await act(() => vi.advanceTimersByTimeAsync(POLL_MS));
    expect(getLeagueWeekMock).toHaveBeenCalledTimes(3);
  });

  it("hands back the game it fetched", async () => {
    const result = kickoffIn(2 * HOUR_MS);
    getLeagueWeekMock.mockResolvedValue(weekOf(result));
    const game: WeekGame = {
      label: "P1",
      league: League.PRO,
      name: "KC @ BUF",
      result,
    };

    const games = [game];
    const { result: hook } = renderHook(() =>
      useLiveGame({ open: true, game, games, week: WEEK }),
    );
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(hook.current.shown?.status).toBe(GameStatus.UPCOMING);
  });
});
