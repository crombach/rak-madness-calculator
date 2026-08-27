import {
  render,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import { League } from "../../types/League";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import { WeekGame } from "../../types/WeekGame";
import { finalGame, liveGame } from "../../utils/scoring/leagueResultFixtures";
import { POLL_MS } from "../../hooks/useLiveGame";

vi.mock("../../utils/getLeagueResults");

import { dialog, getGameResultMock } from "./gameStatusDialogTestSupport";

const proGame: WeekGame = {
  label: "P1",
  league: League.PRO,
  name: "KC @ BUF",
  result: liveGame({ home: "BUF", away: "KC", homeScore: 7, awayScore: 0 }),
};

const scores: RakMadnessScores = { scores: [], games: [proGame] };

/**
 * `onGameFinal` is what wires the dialog's own live poll back into the week's
 * scores (`ResultsFrame` passes it the same `refresh` the navbar button calls),
 * so a game going final while the dialog is open rescoreds and plays the
 * table's wipe animation instead of waiting for a manual refresh.
 */
describe("GameStatusDialog onGameFinal", () => {
  it("calls onGameFinal once the polled game goes final, and not again after", async () => {
    vi.useFakeTimers();
    const onGameFinal = vi.fn();
    getGameResultMock.mockResolvedValue(
      liveGame({ home: "BUF", away: "KC", homeScore: 7, awayScore: 0 }),
    );

    const { rerender } = render(dialog(undefined, false, scores, onGameFinal));
    rerender(dialog("P1", true, scores, onGameFinal));
    await waitForElementToBeRemoved(() => screen.queryByRole("progressbar"));
    expect(onGameFinal).not.toHaveBeenCalled();

    getGameResultMock.mockResolvedValue(
      finalGame({ home: "BUF", away: "KC", homeScore: 24, awayScore: 14 }),
    );
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(onGameFinal).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole("img", { name: "Final" }),
    ).toBeInTheDocument();

    // Final stops the poll, so a further wait cannot call it again.
    await vi.advanceTimersByTimeAsync(POLL_MS * 3);
    expect(onGameFinal).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("shows a game already final on the first render, without fetching it", async () => {
    vi.useFakeTimers();
    const onGameFinal = vi.fn();
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
      dialog(undefined, false, settledScores, onGameFinal),
    );
    rerender(dialog("P1", true, settledScores, onGameFinal));

    // Nothing about it can have changed, so the week's own copy is the answer and
    // goes up on the render that opens the dialog. No wait, and nothing asked for.
    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(getGameResultMock).not.toHaveBeenCalled();
    expect(
      await screen.findByRole("img", { name: "Final" }),
    ).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);

    expect(getGameResultMock).not.toHaveBeenCalled();
    expect(onGameFinal).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
