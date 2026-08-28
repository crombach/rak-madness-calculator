import { PlayerScore } from "../../types/RakMadnessScores";
import { LeagueKey } from "./gameColumns";
import weekShape from "./weekShape";

type Cell = {
  /** Absent where the player left the game blank, which scores them nothing. */
  team?: string;
  hasSpread: boolean;
  text: string;
};

export type RemainingGame = {
  /** `C4`, `P11`: the column label the picks table gives the same game. */
  label: string;
  league: LeagueKey;
  /** Every row's cell, in the order the scores hold their players. */
  cells: Array<Cell>;
};

/**
 * How one game still to be played separates a player from a rival.
 *
 * `opposed` is a game the two picked different teams in. `playerOnly` is one the
 * player picked and the rival left blank. `none` is one the player left blank, or
 * one they both picked the same way.
 */
export type PickDifference = "none" | "opposed" | "playerOnly";

export function pickDifference(
  game: RemainingGame,
  playerIndex: number,
  rivalIndex: number,
): PickDifference {
  const mine = game.cells[playerIndex].team;
  if (mine == null) return "none";
  const theirs = game.cells[rivalIndex].team;
  if (theirs == null) return "playerOnly";
  return theirs === mine ? "none" : "opposed";
}

/**
 * The games still to be played, read a column at a time.
 *
 * Both halves of the app that ask what is still open read them this way: the
 * knockouts, to count what two players have picked differently, and the routes, to
 * walk every way those games can fall.
 */
export default function remainingGames(
  players: Array<PlayerScore>,
): Array<RemainingGame> {
  return weekShape(players).remaining;
}
