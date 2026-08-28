import { PlayerScore } from "../../types/RakMadnessScores";
import weekShape from "./weekShape";

/**
 * Whether a week has a result to state: every game played, and every one of them
 * scoreable. A game nobody could be scored on is a hole in the week, so a leader
 * standing over one is not the winner yet however few games are still being played.
 *
 * Not `isWinnerDecided`, which asks whether the knockouts have settled who won. This
 * asks only whether the week itself has run out.
 */
export default function isEveryGameSettled(
  players: Array<PlayerScore>,
): boolean {
  return weekShape(players).isEveryGameSettled;
}
