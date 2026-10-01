/**
 * The shapes `getSwingGames` answers with, apart from it so that `AppDataContext`
 * can name them without loading `getPlayerAnalysis` into the chunk every route
 * waits on.
 */

/**
 * One team in a game, and the players who are out if it fails to cover, or who
 * went out when it did.
 */
export type SwingSide = {
  team: string;
  /** The first of these players' cells, as the tables show it. */
  pick: string;
  /** In ranking order. */
  players: Array<string>;
};

export type SwingGame = {
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
  sides: Array<SwingSide>;
};

export type SwingGames = {
  /**
   * In column order, college then pro, the way the tables lay them out. Final games
   * included, each with the players it knocked out.
   */
  games: Array<SwingGame>;
};

export const NO_SWINGS: SwingGames = { games: [] };
