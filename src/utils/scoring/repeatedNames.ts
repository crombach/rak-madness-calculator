import { PlayerScore } from "../../types/RakMadnessScores";

/**
 * The names more than one row of the week was entered under.
 *
 * Two players have shared a name in this pool. Nothing downstream of the workbook
 * can tell their rows apart by it, so every reader-facing answer that is read out
 * of a name is wrong for both of them until the workbook is fixed. The tables mark
 * such a row and the analysis refuses to answer for one.
 */
export default function repeatedNames(
  players: Array<PlayerScore>,
): Set<string> {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  players.forEach((player) => {
    if (seen.has(player.name)) {
      repeated.add(player.name);
      return;
    }
    seen.add(player.name);
  });
  return repeated;
}
