import { act, renderHook } from "@testing-library/react";
import { GameStatus } from "../types/ESPN";
import { League, WeekInfo } from "../types/League";
import { WeekGame } from "../types/WeekGame";
import { getGameResultMock } from "../utils/getGameResultMock";
import { liveGame, upcomingGame } from "../utils/scoring/leagueResultFixtures";
import useLiveGame, { MAX_SLEEP_MS, nextPollMs, POLL_MS } from "./useLiveGame";

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

describe("nextPollMs", () => {
  it("waits out the whole gap to a kickoff still hours away", () => {
    expect(nextPollMs(kickoffIn(2 * HOUR_MS), NOW.getTime())).toBe(2 * HOUR_MS);
  });

  it("does not undercut the poll wait for a kickoff seconds away", () => {
    expect(nextPollMs(kickoffIn(3_000), NOW.getTime())).toBe(POLL_MS);
  });

  it("polls a game past its kickoff that ESPN still calls upcoming", () => {
    expect(nextPollMs(kickoffIn(-HOUR_MS), NOW.getTime())).toBe(POLL_MS);
  });

  it("caps a kickoff too far off for a timer to hold", () => {
    expect(nextPollMs(kickoffIn(30 * 24 * HOUR_MS), NOW.getTime())).toBe(
      MAX_SLEEP_MS,
    );
  });

  it("polls a game being played, whatever its kickoff says", () => {
    const result = liveGame({
      home: "BUF",
      away: "KC",
      homeScore: 7,
      awayScore: 0,
    });
    expect(nextPollMs(result, NOW.getTime())).toBe(POLL_MS);
  });

  it("polls again when nothing answered, since the next list may hold it", () => {
    expect(nextPollMs(null, NOW.getTime())).toBe(POLL_MS);
  });
});

describe("useLiveGame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    getGameResultMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks once about a game that has not kicked off, then sleeps to kickoff", async () => {
    const result = kickoffIn(2 * HOUR_MS);
    getGameResultMock.mockResolvedValue(result);
    const game: WeekGame = {
      label: "P1",
      league: League.PRO,
      name: "KC @ BUF",
      result,
    };

    const games = [game];
    renderHook(() => useLiveGame({ open: true, game, games, week: WEEK }));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(getGameResultMock).toHaveBeenCalledTimes(1);

    // The 15 second poll would have asked four more times over this minute.
    await act(() => vi.advanceTimersByTimeAsync(POLL_MS * 4));
    expect(getGameResultMock).toHaveBeenCalledTimes(1);

    getGameResultMock.mockResolvedValue(
      liveGame({ home: "BUF", away: "KC", homeScore: 0, awayScore: 0 }),
    );
    await act(() => vi.advanceTimersByTimeAsync(2 * HOUR_MS - POLL_MS * 4));
    expect(getGameResultMock).toHaveBeenCalledTimes(2);

    // Kicked off, so it is back on the poll.
    await act(() => vi.advanceTimersByTimeAsync(POLL_MS));
    expect(getGameResultMock).toHaveBeenCalledTimes(3);
  });

  it("hands back the game it fetched", async () => {
    const result = kickoffIn(2 * HOUR_MS);
    getGameResultMock.mockResolvedValue(result);
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
