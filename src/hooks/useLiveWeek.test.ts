import { act, renderHook } from "@testing-library/react";
import { League } from "../types/League";
import { WeekGame } from "../types/WeekGame";
import { liveGame, weekOf } from "../utils/scoring/leagueResultFixtures";
import { LeagueResults } from "../utils/scoring/leagueResults";
import useLiveWeek, { POLL_MS } from "./useLiveWeek";

const NOW = new Date("2024-10-06T12:00:00Z");

const RESULT = liveGame({
  home: "BUF",
  away: "KC",
  homeScore: 7,
  awayScore: 0,
});
const GAMES: Array<WeekGame> = [
  { label: "P1", league: League.PRO, name: "KC @ BUF", result: RESULT },
];

let hidden = false;

function setHidden(next: boolean) {
  hidden = next;
  document.dispatchEvent(new Event("visibilitychange"));
}

function pollWeek() {
  const onPoll =
    vi.fn<
      (leagues: ReadonlyArray<League>) => Promise<LeagueResults | undefined>
    >();
  onPoll.mockResolvedValue(weekOf("pro", RESULT));
  renderHook(() =>
    useLiveWeek({
      active: true,
      leagues: [League.PRO],
      games: GAMES,
      onPoll,
    }),
  );
  return onPoll;
}

describe("useLiveWeek, in a hidden tab", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    hidden = false;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("asks nothing while the tab is hidden", async () => {
    const onPoll = pollWeek();
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(onPoll).toHaveBeenCalledTimes(1);

    act(() => setHidden(true));
    await act(() => vi.advanceTimersByTimeAsync(POLL_MS * 3));

    expect(onPoll).toHaveBeenCalledTimes(1);
  });

  it("asks once on coming back where a tick was missed, then polls on", async () => {
    const onPoll = pollWeek();
    await act(() => vi.advanceTimersByTimeAsync(0));
    act(() => setHidden(true));
    await act(() => vi.advanceTimersByTimeAsync(POLL_MS * 3));

    await act(async () => setHidden(false));
    expect(onPoll).toHaveBeenCalledTimes(2);

    await act(() => vi.advanceTimersByTimeAsync(POLL_MS));
    expect(onPoll).toHaveBeenCalledTimes(3);
  });

  it("asks nothing extra on coming back before a tick was due", async () => {
    const onPoll = pollWeek();
    await act(() => vi.advanceTimersByTimeAsync(0));
    act(() => setHidden(true));
    await act(() => vi.advanceTimersByTimeAsync(POLL_MS / 2));

    await act(async () => setHidden(false));
    expect(onPoll).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(POLL_MS / 2));
    expect(onPoll).toHaveBeenCalledTimes(2);
  });
});
