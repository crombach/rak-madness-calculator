/** A game still to be played, named the way the picks table names its columns. */
export type RemainingPick = {
  label: string;
  /** The cell as written, so the team and the spread read as they do in the table. */
  pick: string;
};

/**
 * How the week is settled once a route's games land.
 *
 * `settled` means the Monday night game is already final, so the standings carry its
 * result and nothing here is open. `range` carries the totals that win, with an end
 * absent where that side is unbounded.
 */
export type MondayNightOutlook =
  | { kind: "notNeeded" }
  | { kind: "settled" }
  | { kind: "range"; min?: number; max?: number };

/**
 * A set of ways through, as the blocks that say what they ask for: the games every
 * one of them needs, then the choice left over as a pool or as a list.
 */
export type WaysThrough = {
  /** Games every route needs. */
  mustWin: Array<RemainingPick>;
  /** Set when the routes past `mustWin` are exactly any `choose` of one pool. */
  pool?: { choose: number; games: Array<RemainingPick> };
  /** Set instead of `pool`, when the routes are not one pool of one size. */
  routes?: Array<VictoryRoute>;
  /** Routes past the ones `routes` lists. */
  hiddenRouteCount: number;
};

/** One way past the must-win games, and how it ends. */
export type VictoryRoute = {
  games: Array<RemainingPick>;
  mondayNight: MondayNightOutlook;
};

/**
 * What a player has to do to win a week that is still being played.
 *
 * Winning means finishing level with everyone or better, not finishing alone.
 * `applyKnockouts` leaves a genuine tie standing and calls both players the winner,
 * and this follows it.
 */
export type PlayerAnalysis =
  /** `explanation` is the reason `applyKnockouts` already wrote. */
  | { kind: "knockedOut"; player: string; explanation?: string }
  /** No result left can take the week off them. */
  | { kind: "clinched"; player: string }
  /**
   * Too many games left to work out the routes, so this is a floor rather than a
   * route: the fewest picks that could still be enough against the hardest rival.
   */
  | {
      kind: "headline";
      player: string;
      /** How many of the games still to be played the player has a pick in. */
      remainingPickCount: number;
      minimumWins: number;
      /** Whether the player only draws level at that count, leaving Monday night to decide. */
      needsMondayNight: boolean;
      /**
       * Games no win can do without, and all of them: this is what the search
       * would name, read a game at a time. Empty where nothing can be proven,
       * never a part of the list.
       */
      mustWin: Array<RemainingPick>;
    }
  | ({
      kind: "paths";
      player: string;
      /** Set when every route ends the same way, whether or not `routes` lists them. */
      mondayNight?: MondayNightOutlook;
      /**
       * The ways to take the week whatever Monday night's total is, asked and
       * answered the same way the ways above it are. Absent where no set of the
       * player's picks takes it alone.
       */
      outright?: WaysThrough;
    } & WaysThrough);
