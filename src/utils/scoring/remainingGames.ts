import { PlayerScore } from "../../types/RakMadnessScores";
import { LeagueKey } from "./gameColumns";
import weekShape from "./weekShape";

type Cell = {
  /**
   * Absent where nothing the player wrote can score: a blank cell, or a pick on
   * a game the week's results do not hold.
   */
  team?: string;
  hasSpread: boolean;
  text: string;
};

export type RemainingGame = {
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

export type PairDifferences = {
  differentCollegePicks: number;
  differentProPicks: number;
  differentProPicksWithSpreads: number;
};

/**
 * How many of the games still to be played these two players have picked
 * differently, split by the tiebreaker tier each one can move.
 *
 * A game the rival left blank counts, because the active player can take a point
 * there that the rival cannot.
 */
export function countDifferences(
  games: Array<RemainingGame>,
  activeIndex: number,
  rivalIndex: number,
): PairDifferences {
  const differences = {
    differentCollegePicks: 0,
    differentProPicks: 0,
    differentProPicksWithSpreads: 0,
  };
  games.forEach((game) => {
    if (pickDifference(game, activeIndex, rivalIndex) === "none") return;
    const activeCell = game.cells[activeIndex];
    if (game.league === "college") {
      differences.differentCollegePicks += 1;
      return;
    }
    differences.differentProPicks += 1;
    if (activeCell.hasSpread) {
      differences.differentProPicksWithSpreads += 1;
    }
  });
  return differences;
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
