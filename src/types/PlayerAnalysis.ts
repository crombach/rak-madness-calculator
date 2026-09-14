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

/** The one outlook that is a total still to come, rather than a question closed. */
export type MondayNightRange = Extract<MondayNightOutlook, { kind: "range" }>;

/** One game past the must-win games, over the routes that need it. */
export type PickShare = RemainingPick & {
  /** Routes needing this game, out of `PickShares.routeCount`. */
  routes: number;
};

/**
 * Each game past `mustWin` named once, against a count of the routes.
 *
 * A list says which picks pair with which and a share cannot, so this stands in only
 * once the list can no longer show every route. Past that the list is a sample, and
 * a share taken over every route says more than three routes out of twenty-four do.
 *
 * Every route to a win is counted here, whether or not it leans on the tiebreaker.
 * `outright` splits those apart for a reader who can take them one at a time. A
 * share names a game and not a route, so split it would stand twice over the same
 * games with no way to tell which table wanted which.
 */
export type PickShares = {
  /** Every route there is, which is what each share is a share of. */
  routeCount: number;
  /** Most-needed first. */
  games: Array<PickShare>;
  /**
   * The total the most routes ask for, and how many ask what.
   *
   * Set only where the routes disagree about the tiebreaker. Where they agree, the
   * block below carries the outlook and this would say it a second time.
   *
   * One total is named and the rest are left out. Naming them all is a second table
   * of ranges, and `routes` under `routeCount` already says there are others.
   */
  mondayNight?: {
    /** What the most routes ask for, and what one route asks where each asks its own. */
    points: MondayNightRange;
    /** Routes asking for that total, out of `PickShares.routeCount`. */
    routes: number;
    /**
     * Whether the tiebreaker decides the week whatever the player does, which a
     * reader cannot work out from `routes` alone.
     *
     * True where every route asks for a total and no set of games takes the week
     * without one. A route here asks the fewest games it can, so a set winning
     * outright stands above one of them rather than beside it and is not counted.
     * It still answers this, since it is a way to win with the tiebreaker out of it.
     */
    isAlways: boolean;
  };
  /**
   * How many more games the cheapest way to win outright asks for than the
   * cheapest way to win at all.
   *
   * Absent where no way wins outright, and where the cheapest way already does.
   * Only a table gives this, since a list of ways says it by standing in two
   * halves instead.
   *
   * A count of the ways that win outright would not do. A way taking the week
   * alone holds a smaller winning way inside it, so it stands in both lists, and
   * counting it against `routeCount` would count one win twice. Two cheapest ways
   * compare without that.
   */
  outrightCost?: number;
};

/**
 * A set of ways through, as the blocks that say what they ask for: the games every
 * one of them needs, then the choice left over as a pool, a list, or a set of shares.
 */
export type WaysThrough = {
  /** Games every route needs. */
  mustWin: Array<RemainingPick>;
  /** Set when the routes past `mustWin` are exactly any `choose` of one pool. */
  pool?: { choose: number; games: Array<RemainingPick> };
  /** Set instead of `pool`, when the routes are not one pool of one size. */
  routes?: Array<VictoryRoute>;
  /** Set instead of `routes`, when there are more routes than a list can show. */
  shares?: PickShares;
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
   * Too many games left to work out the routes, so only the games that can be
   * proven one at a time are named. Nothing here is a way through.
   */
  | {
      kind: "headline";
      player: string;
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
       * answered the same way the ways above it are.
       *
       * Absent where no set of the player's picks takes it alone, and absent too
       * where those sets ask no more games than winning the week does, since then
       * they are the ways above and saying them twice would name each one twice.
       * Set, and the ways above hold none of these: each way is named once.
       */
      outright?: WaysThrough;
    } & WaysThrough);
