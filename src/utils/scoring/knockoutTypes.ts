import { Tiebreaker } from "../../types/RakMadnessScores";

/**
 * The shapes `getKnockouts` answers with, apart from it so that `AppDataContext`
 * can name them without loading `getPlayerAnalysis` into the chunk every route
 * waits on.
 */

/**
 * One team in a game, and the players who are out if it fails to cover, or who
 * went out behind on total once it failed to.
 */
export type KnockoutSide = {
  team: string;
  /** The first of these players' cells, as the tables show it. */
  pick: string;
  /** In ranking order. */
  players: Array<string>;
};

/**
 * The players a final game left level on total with a rival and knocked out on
 * one tiebreaker, whatever their pick on it did.
 */
export type KnockoutTiebreaker = {
  tiebreaker: Tiebreaker;
  /** In ranking order. */
  players: Array<string>;
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
  /** On a final game, who it knocked out on a tiebreaker, in tiebreak order. */
  tiebreakers?: Array<KnockoutTiebreaker>;
};

export type KnockoutGames = {
  /**
   * In column order, college then pro, the way the tables lay them out. Final games
   * included, each with the players it knocked out.
   */
  games: Array<KnockoutGame>;
};

/** The final game a player went out in, or undefined where none knocked them out. */
export function finalGameThatKnockedOut(
  knockouts: KnockoutGames | undefined,
  playerName: string,
): KnockoutGame | undefined {
  return knockouts?.games.find(
    (game) =>
      game.isFinal &&
      [...game.sides, ...(game.tiebreakers ?? [])].some((group) =>
        group.players.includes(playerName),
      ),
  );
}
