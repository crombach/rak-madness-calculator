import {
  PlayerScore,
  RakMadnessScores,
  Status,
} from "../../types/RakMadnessScores";
import { LEAGUES } from "./gameColumns";

/** Whether the pick can be scored either way, which is what ends a game for it. */
function hasOutcome(status: Status): boolean {
  return status === "yes" || status === "no";
}

/**
 * Whether the week has a winner. Every game is settled, and the Monday night
 * total that decides the tiebreaker is in.
 *
 * Read a column at a time rather than a row at a time, because a row cannot tell
 * the two kinds of unscoreable pick apart. A game the workbook described two ways,
 * or one nobody has a result for, comes back unscoreable on every row and leaves
 * the week open. A blank cell comes back the same way on one row alone, and one
 * player's blank says nothing about whether the game finished.
 *
 * Whoever the knockouts left standing once the week is settled has won it, so
 * nothing here looks at a score.
 */
export default function isWinnerDecided(scores: RakMadnessScores): boolean {
  if (scores.tiebreaker == null) {
    return false;
  }
  const [firstPlayer] = scores.scores;
  if (firstPlayer == null) {
    return false;
  }
  // Every row holds one pick per game in the same order, so the first row's
  // length is the week's game count.
  return LEAGUES.every((league) =>
    firstPlayer[league].every((_, game) =>
      scores.scores.some((player: PlayerScore) =>
        hasOutcome(player[league][game].status),
      ),
    ),
  );
}
