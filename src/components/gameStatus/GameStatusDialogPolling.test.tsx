import { render, screen } from "@testing-library/react";
import { POLL_MS } from "../../hooks/useLiveGame";
import { League } from "../../types/League";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import { WeekGame } from "../../types/WeekGame";
import {
  finalGame,
  liveGame,
  upcomingGame,
  weekOf,
} from "../../utils/scoring/leagueResultFixtures";
import { LeagueResults } from "../../utils/scoring/leagueResults";
import { dialog } from "./gameStatusDialogTestSupport";

const proGame: WeekGame = {
  label: "P1",
  league: League.PRO,
  name: "KC @ BUF",
  result: liveGame({ home: "BUF", away: "KC", homeScore: 7, awayScore: 0 }),
};

const scores: RakMadnessScores = { scores: [], games: [proGame] };

/** The other game's ESPN event, which every fixture but that one shares. */
const SECOND_EVENT_ID = "2";

function poller() {
  return vi.fn<
    (leagues: ReadonlyArray<League>) => Promise<LeagueResults | undefined>
  >();
}

/**
 * `onPoll` is the app's one refresh, told to fetch the league of the game the dialog
 * is open on. `ResultsFrame` passes it `rescore`, which scores the workbook already
 * in hand rather than reading the sheet again, so a game that moves while the dialog
 * is open reaches the picks table's column marks and its wipe animations without
 * waiting for a manual refresh.
 *
 * What counts as a move, and what a move costs, belong to `hasMoved` and are covered
 * in `scoring/leagueResults.test.ts`. What is covered here is when the dialog asks at
 * all, which league it names, and when it stops.
 */
describe("GameStatusDialog polling", () => {
  it("fetches the watched game's league, and no other", async () => {
    vi.useFakeTimers();
    const onPoll = poller();
    onPoll.mockResolvedValue(weekOf("pro", proGame.result!));

    const { rerender } = render(dialog(undefined, false, scores, onPoll));
    rerender(dialog("P1", true, scores, onPoll));
    await vi.advanceTimersByTimeAsync(0);

    expect(onPoll).toHaveBeenCalledWith([League.PRO]);
    expect(onPoll).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it("keeps polling for the league after the watched game is final", async () => {
    // The reader opens the early game and it finishes while the later ones are
    // still being played. Their columns are what the poll now keeps in step, so it
    // cannot stop at the watched game's own final.
    vi.useFakeTimers();
    const onPoll = poller();
    const stillPlaying = () => ({
      ...liveGame({ home: "PHI", away: "DAL", homeScore: 3, awayScore: 0 }),
      id: SECOND_EVENT_ID,
    });
    const later: WeekGame = {
      label: "P2",
      league: League.PRO,
      name: "DAL @ PHI",
      result: stillPlaying(),
    };
    const both: RakMadnessScores = { scores: [], games: [proGame, later] };
    const watchedFinal = finalGame({
      home: "BUF",
      away: "KC",
      homeScore: 24,
      awayScore: 14,
    });
    onPoll.mockResolvedValue(
      weekOf(
        "pro",
        liveGame({ home: "BUF", away: "KC", homeScore: 7, awayScore: 0 }),
        stillPlaying(),
      ),
    );

    const { rerender } = render(dialog(undefined, false, both, onPoll));
    rerender(dialog("P1", true, both, onPoll));
    await vi.advanceTimersByTimeAsync(0);
    expect(onPoll).toHaveBeenCalledOnce();

    // The watched game goes final. The other one is still being played, so the
    // poll carries on for it.
    onPoll.mockResolvedValue(weekOf("pro", watchedFinal, stillPlaying()));
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(onPoll).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(onPoll).toHaveBeenCalledTimes(3);

    // Every game of the league is over now, so the poll stops for good.
    onPoll.mockResolvedValue(
      weekOf("pro", watchedFinal, {
        ...finalGame({
          home: "PHI",
          away: "DAL",
          homeScore: 20,
          awayScore: 17,
        }),
        id: SECOND_EVENT_ID,
      }),
    );
    await vi.advanceTimersByTimeAsync(POLL_MS);
    const askedByTheEnd = onPoll.mock.calls.length;
    await vi.advanceTimersByTimeAsync(POLL_MS * 4);
    expect(onPoll).toHaveBeenCalledTimes(askedByTheEnd);

    vi.useRealTimers();
  });

  it("does not let the watched game's kickoff silence the league", async () => {
    // The reader opens the Sunday night column in the afternoon. Waiting on that
    // kickoff would leave the whole afternoon slate unpolled.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-10-06T17:00:00Z"));
    const onPoll = poller();
    const notYet = () => ({
      ...upcomingGame({ home: "PHI", away: "DAL" }),
      id: SECOND_EVENT_ID,
      date: new Date("2024-10-07T00:20:00Z"),
    });
    const tonight: WeekGame = {
      label: "P2",
      league: League.PRO,
      name: "DAL @ PHI",
      result: notYet(),
    };
    const waiting: WeekGame = {
      ...proGame,
      result: upcomingGame({ home: "BUF", away: "KC" }),
    };
    const both: RakMadnessScores = { scores: [], games: [waiting, tonight] };
    onPoll.mockResolvedValue(
      weekOf("pro", upcomingGame({ home: "BUF", away: "KC" }), notYet()),
    );

    const { rerender } = render(dialog(undefined, false, both, onPoll));
    // Opened on the night game, which is hours away.
    rerender(dialog("P2", true, both, onPoll));
    await vi.advanceTimersByTimeAsync(0);
    expect(onPoll).toHaveBeenCalledOnce();

    // The afternoon game's kickoff has passed, so the poll asks again rather than
    // waiting on the night game's.
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(onPoll).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("waits out the kickoff when nothing in the league has started", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-10-06T17:00:00Z"));
    const onPoll = poller();
    const tonight = {
      ...upcomingGame({ home: "BUF", away: "KC" }),
      date: new Date("2024-10-07T00:20:00Z"),
    };
    const waiting: RakMadnessScores = {
      scores: [],
      games: [{ ...proGame, result: tonight }],
    };
    onPoll.mockResolvedValue(weekOf("pro", tonight));

    const { rerender } = render(dialog(undefined, false, waiting, onPoll));
    rerender(dialog("P1", true, waiting, onPoll));
    await vi.advanceTimersByTimeAsync(0);
    // Asked once, so a game ESPN has already started is never sat on.
    expect(onPoll).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(POLL_MS * 4);
    expect(onPoll).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it("does not restart its wait when a rescore replaces the week's games", async () => {
    // A rescore hands back a new list with every game in it a new object. With that
    // list driving the poll, each one would tear the timer down and ask again at
    // once, which is the loop a poll that fetched for itself used to guard against.
    vi.useFakeTimers();
    const onPoll = poller();
    onPoll.mockResolvedValue(weekOf("pro", proGame.result!));

    const { rerender } = render(dialog(undefined, false, scores, onPoll));
    rerender(dialog("P1", true, scores, onPoll));
    await vi.advanceTimersByTimeAsync(0);
    expect(onPoll).toHaveBeenCalledOnce();

    const rescored: RakMadnessScores = { scores: [], games: [{ ...proGame }] };
    rerender(dialog("P1", true, rescored, onPoll));
    await vi.advanceTimersByTimeAsync(0);
    expect(onPoll).toHaveBeenCalledOnce();

    // The next tick is the one it was always going to be, on the poll's own clock.
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(onPoll).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("shows a game already final on the first render, without polling for it", async () => {
    vi.useFakeTimers();
    const onPoll = poller();
    const settledGame: WeekGame = {
      ...proGame,
      result: finalGame({
        home: "BUF",
        away: "KC",
        homeScore: 24,
        awayScore: 14,
      }),
    };
    const settledScores: RakMadnessScores = {
      scores: [],
      games: [settledGame],
    };

    const { rerender } = render(
      dialog(undefined, false, settledScores, onPoll),
    );
    rerender(dialog("P1", true, settledScores, onPoll));

    // Nothing about it can have changed, so the week's own copy is the answer and
    // goes up on the render that opens the dialog. No wait, and nothing asked for.
    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(
      await screen.findByRole("img", { name: "Final" }),
    ).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);
    expect(onPoll).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
