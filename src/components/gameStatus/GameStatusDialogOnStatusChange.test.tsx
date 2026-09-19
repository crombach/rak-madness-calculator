import {
  render,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import { League } from "../../types/League";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import { WeekGame } from "../../types/WeekGame";
import {
  delayedGame,
  finalGame,
  liveGame,
  upcomingGame,
} from "../../utils/scoring/leagueResultFixtures";
import { POLL_MS } from "../../hooks/useLiveGame";

vi.mock("../../utils/getLeagueResults");

import { getLeagueResultMock } from "../../utils/getLeagueResultMock";
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

/**
 * `onStatusChange` is what wires the dialog's own live poll back into the week's
 * scores. `ResultsFrame` passes it `rescore`, which scores the workbook already in
 * hand rather than reading the sheet again, so a game that moves while the dialog is
 * open reaches the picks table's column marks and its wipe animations without
 * waiting for a manual refresh.
 */
describe("GameStatusDialog onStatusChange", () => {
  it("calls onStatusChange once the polled game goes final, and not again after", async () => {
    vi.useFakeTimers();
    const onStatusChange = vi.fn();
    getLeagueResultMock.mockResolvedValue(
      liveGame({ home: "BUF", away: "KC", homeScore: 7, awayScore: 0 }),
    );

    const { rerender } = render(
      dialog(undefined, false, scores, onStatusChange),
    );
    rerender(dialog("P1", true, scores, onStatusChange));
    await waitForElementToBeRemoved(() => screen.queryByRole("progressbar"));
    expect(onStatusChange).not.toHaveBeenCalled();

    getLeagueResultMock.mockResolvedValue(
      finalGame({ home: "BUF", away: "KC", homeScore: 24, awayScore: 14 }),
    );
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole("img", { name: "Final" }),
    ).toBeInTheDocument();

    // Final stops the poll, so a further wait cannot call it again.
    await vi.advanceTimersByTimeAsync(POLL_MS * 3);
    expect(onStatusChange).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("stops after the rescore its own final sets off", async () => {
    vi.useFakeTimers();
    const onStatusChange = vi.fn();
    getLeagueResultMock.mockResolvedValue(
      liveGame({ home: "BUF", away: "KC", homeScore: 7, awayScore: 0 }),
    );

    const { rerender } = render(
      dialog(undefined, false, scores, onStatusChange),
    );
    rerender(dialog("P1", true, scores, onStatusChange));
    await waitForElementToBeRemoved(() => screen.queryByRole("progressbar"));

    getLeagueResultMock.mockResolvedValue(
      finalGame({ home: "BUF", away: "KC", homeScore: 24, awayScore: 14 }),
    );
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(onStatusChange).toHaveBeenCalledTimes(1);

    // What the rescore hands back: a new list, every game in it a new object. This
    // one still has the game live, which is the worst its own read of ESPN can be.
    const rescored: RakMadnessScores = { scores: [], games: [{ ...proGame }] };
    rerender(dialog("P1", true, rescored, onStatusChange));
    await vi.advanceTimersByTimeAsync(POLL_MS * 4);

    // Announced once, so the rescore cannot set off the next one.
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole("img", { name: "Final" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).toBeNull();

    vi.useRealTimers();
  });

  it("says nothing about a state it already announced, however often the reader goes back to a game", async () => {
    vi.useFakeTimers();
    const onStatusChange = vi.fn();
    const live = () =>
      liveGame({ home: "BUF", away: "KC", homeScore: 7, awayScore: 0 });
    // Two games rather than one, each on its own ESPN event, since what is
    // announced is the event and not the column it was opened on.
    const second: WeekGame = {
      label: "P2",
      league: League.PRO,
      name: "DAL @ PHI",
      result: { ...live(), id: SECOND_EVENT_ID },
    };
    const both: RakMadnessScores = { scores: [], games: [proGame, second] };
    getLeagueResultMock.mockResolvedValue(live());

    const { rerender } = render(dialog(undefined, false, both, onStatusChange));
    rerender(dialog("P1", true, both, onStatusChange));
    await waitForElementToBeRemoved(() => screen.queryByRole("progressbar"));

    // Answered by the event asked about, so each game's final names its own teams.
    getLeagueResultMock.mockImplementation(async (_league, _week, eventId) =>
      eventId === SECOND_EVENT_ID
        ? finalGame({ home: "PHI", away: "DAL", homeScore: 20, awayScore: 17 })
        : finalGame({ home: "BUF", away: "KC", homeScore: 24, awayScore: 14 }),
    );
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(onStatusChange).toHaveBeenCalledTimes(1);

    // The rescore each final sets off, whose own read of ESPN still has both live.
    const rescored: RakMadnessScores = {
      scores: [],
      games: [{ ...proGame }, { ...second }],
    };
    rerender(dialog("P2", true, rescored, onStatusChange));
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(onStatusChange).toHaveBeenCalledTimes(2);

    // Back to the first game, which was announced before the second one was.
    rerender(dialog("P1", true, rescored, onStatusChange));
    await vi.advanceTimersByTimeAsync(POLL_MS * 4);
    expect(onStatusChange).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("says so when a game the week has yet to kick off starts", async () => {
    // The picks table draws a mark on the heading of a game being played, so a
    // reader watching the table learns it kicked off from the rescore this sets
    // off rather than from a refresh they had to ask for.
    vi.useFakeTimers();
    const onStatusChange = vi.fn();
    const upcoming: WeekGame = {
      ...proGame,
      result: upcomingGame({ home: "BUF", away: "KC" }),
    };
    const waiting: RakMadnessScores = { scores: [], games: [upcoming] };
    getLeagueResultMock.mockResolvedValue(
      upcomingGame({ home: "BUF", away: "KC" }),
    );

    const { rerender } = render(
      dialog(undefined, false, waiting, onStatusChange),
    );
    rerender(dialog("P1", true, waiting, onStatusChange));
    await waitForElementToBeRemoved(() => screen.queryByRole("progressbar"));
    // The poll agrees with the week, so there is nothing to tell it.
    expect(onStatusChange).not.toHaveBeenCalled();

    getLeagueResultMock.mockResolvedValue(
      liveGame({ home: "BUF", away: "KC", homeScore: 7, awayScore: 0 }),
    );
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole("img", { name: "Live" }),
    ).toBeInTheDocument();

    // Still live on the polls after it, which is not a move.
    await vi.advanceTimersByTimeAsync(POLL_MS * 3);
    expect(onStatusChange).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("says so when a game stops and again when it starts again", async () => {
    vi.useFakeTimers();
    const onStatusChange = vi.fn();
    getLeagueResultMock.mockResolvedValue(
      liveGame({ home: "BUF", away: "KC", homeScore: 7, awayScore: 0 }),
    );

    const { rerender } = render(
      dialog(undefined, false, scores, onStatusChange),
    );
    rerender(dialog("P1", true, scores, onStatusChange));
    await waitForElementToBeRemoved(() => screen.queryByRole("progressbar"));
    expect(onStatusChange).not.toHaveBeenCalled();

    getLeagueResultMock.mockResolvedValue(
      delayedGame({
        home: "BUF",
        away: "KC",
        homeScore: 7,
        awayScore: 0,
        period: 3,
      }),
    );
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole("img", { name: "Delayed" }),
    ).toBeInTheDocument();

    // Still stopped, which is not a second move.
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);
    expect(onStatusChange).toHaveBeenCalledTimes(1);

    // Play resumes, which is a second move and a second mark for the table. The
    // rescore the first move set off has not landed, so the week's own copy still
    // has the game live. What the poll last announced is what this is measured
    // against, or a game going back to where the week has it would be read as a
    // game that never moved. At the score the week already has, so the mark is the
    // only thing that moved.
    getLeagueResultMock.mockResolvedValue(
      liveGame({ home: "BUF", away: "KC", homeScore: 7, awayScore: 0 }),
    );
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(onStatusChange).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByRole("img", { name: "Live" }),
    ).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("says so when a live game's score moves", async () => {
    // Every pick under the column is scored against this number, so a score the
    // week does not have yet is a table full of outcomes that are out of date.
    vi.useFakeTimers();
    const onStatusChange = vi.fn();
    getLeagueResultMock.mockResolvedValue(
      liveGame({ home: "BUF", away: "KC", homeScore: 7, awayScore: 0 }),
    );

    const { rerender } = render(
      dialog(undefined, false, scores, onStatusChange),
    );
    rerender(dialog("P1", true, scores, onStatusChange));
    await waitForElementToBeRemoved(() => screen.queryByRole("progressbar"));
    expect(onStatusChange).not.toHaveBeenCalled();

    getLeagueResultMock.mockResolvedValue(
      liveGame({ home: "BUF", away: "KC", homeScore: 14, awayScore: 0 }),
    );
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(onStatusChange).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("14")).toBeInTheDocument();

    // The same score on the polls after it, which is not a move.
    await vi.advanceTimersByTimeAsync(POLL_MS * 3);
    expect(onStatusChange).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("shows a game already final on the first render, without fetching it", async () => {
    vi.useFakeTimers();
    const onStatusChange = vi.fn();
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
      dialog(undefined, false, settledScores, onStatusChange),
    );
    rerender(dialog("P1", true, settledScores, onStatusChange));

    // Nothing about it can have changed, so the week's own copy is the answer and
    // goes up on the render that opens the dialog. No wait, and nothing asked for.
    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(getLeagueResultMock).not.toHaveBeenCalled();
    expect(
      await screen.findByRole("img", { name: "Final" }),
    ).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);

    expect(getLeagueResultMock).not.toHaveBeenCalled();
    expect(onStatusChange).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
