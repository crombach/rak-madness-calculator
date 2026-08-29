import { PlayerScore } from "../../types/RakMadnessScores";
import weekShape from "./weekShape";

/**
 * The games nobody can be scored on, by the label the picks table gives them.
 *
 * A contradicted spread or a game the results do not hold is a hole in the week
 * itself, so a week carrying one is not finished however many of its games are.
 * A cell left blank is not one of those: it scores the player nothing and says
 * nothing about the game, and every week has some.
 */
export default function unscoreableGames(
  players: Array<PlayerScore>,
): Array<string> {
  return weekShape(players).unscoreable;
}
