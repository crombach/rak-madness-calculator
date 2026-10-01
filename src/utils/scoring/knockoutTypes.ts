import { Tiebreaker } from "../../types/RakMadnessScores";

/**
 * The shapes `getKnockouts` answers with, apart from it so that `AppDataContext`
 * can name them without loading `getPlayerAnalysis` into the chunk every route
 * waits on.
 */

/**
 * One team in a game, and the players who are out if it fails to cover, or who
 * went out on its result.
 */
export type KnockoutSide = {
  team: string;
  /** The first of these players' cells, as the tables show it. */
  pick: string;
  /** In ranking order. */
  players: Array<string>;
  /** On a final game, each player here a tiebreaker knocked out, by name. */
  tiebreakers?: Record<string, TiebreakerKnockout>;
};

/** What settled a knockout that came down to a tie on total. */
export type TiebreakerKnockout = {
  tiebreaker: Tiebreaker;
  /** The player's MNF Points, on the `mnfPoints` tier. */
  pick?: number;
};

/**
 * The players a final game knocked out on one tiebreaker though their pick scored,
 * so no side of the game holds them.
 */
export type KnockoutTiebreaker = {
  tiebreaker: Tiebreaker;
  /** The Monday night total, on the `mnfPoints` tier. */
  total?: number;
  /** In ranking order. */
  players: Array<string>;
  /** Each of them, by name, where the knockout says what settled it. */
  tiebreakers: Record<string, TiebreakerKnockout>;
};

export type KnockoutGame = {
  label: string;
  name: string;
  /**
   * Whether the game is over. A final game's sides are the ones it knocked out,
   * each player credited to the first final game that did. An open game's are the
   * ones it would.
   */
  isFinal: boolean;
  /**
   * The away side first, as the game is named and as Game Status sets it. Most
   * players first where no result says which side is away.
   */
  sides: Array<KnockoutSide>;
  /** On a final game, who it knocked out on a tiebreaker rather than a pick, by tier. */
  tiebreakers?: Array<KnockoutTiebreaker>;
};

export type KnockoutGames = {
  /**
   * In column order, college then pro, the way the tables lay them out. Final games
   * included, each with the players it knocked out.
   */
  games: Array<KnockoutGame>;
};

export const NO_KNOCKOUTS: KnockoutGames = { games: [] };
