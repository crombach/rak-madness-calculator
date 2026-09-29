import { League } from "../types/League";
import { LeagueKey } from "../utils/scoring/gameColumns";
import { ESPN_LEAGUE } from "../utils/scoring/leagueResults";

/**
 * The floor on how long a pass says it is running.
 *
 * Cleared at the later of this and the work finishing, so a slow pass turns the
 * refresh button, and lights the Game Status bar, for its whole run. A rescore of
 * the workbook in hand comes back in single milliseconds, and a button that spins
 * for that long reads as a button that did nothing.
 */
export const REFRESHING_FLOOR_MS = 500;

/** Held still, so a render with nothing in flight is not a new object each time. */
export const NO_LEAGUES: ReadonlySet<League> = new Set();

type Rescore = (leagues?: ReadonlyArray<League>) => Promise<unknown>;

/** Where the passes publish what a render reads. */
type Publish = {
  refreshing: (isRefreshing: boolean) => void;
  fetching: (leagues: ReadonlySet<League>) => void;
};

/** One pass's hold on the refresh button. Starts once, and stops once, floored. */
export type Turn = { start: () => void; stop: () => Promise<void> };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * The bookkeeping every scoring pass shares: which passes turn the button, which
 * leagues are being fetched, and the rescore a pass in flight turned away.
 *
 * Counted rather than flagged throughout. A refresh and a rescore can overlap,
 * and the rescore is far the quicker, so the first one out must not stop the
 * button or put the Game Status bar out on behalf of the one still working.
 */
export function createScoringPasses(publish: Publish) {
  let passesRunning = 0;
  let isAttemptInFlight = false;
  let isRefreshInFlight = false;
  const fetchCounts = new Map<League, number>();
  const fetchTimers = new Set<ReturnType<typeof setTimeout>>();
  // One slot rather than a queue, since every rescore reads the same workbook
  // against the same week, so a second one would do the first one's work again.
  let pending: { leagues?: ReadonlyArray<League> } | undefined;
  let rescore: Rescore | undefined;

  const publishFetching = () => {
    const live = new Set<League>();
    fetchCounts.forEach((count, league) => {
      if (count > 0) live.add(league);
    });
    publish.fetching(live.size > 0 ? live : NO_LEAGUES);
  };

  return {
    /**
     * Held for the length of an attempt, so a second click cannot start another
     * one before the state update announcing the first has even landed.
     */
    setAttemptInFlight(inFlight: boolean) {
      isAttemptInFlight = inFlight;
    },

    /**
     * Held for the length of a refresh a reader asked for. Only another of those
     * is turned away by it, which is what lets one supersede a rescore. It is
     * also the only thing that turns away a second pull, since a pull arms on the
     * phone and the week alone and fires on every release. Answers false, and
     * holds nothing, where one is already running.
     */
    beginRefresh(): boolean {
      if (isRefreshInFlight) return false;
      isRefreshInFlight = true;
      return true;
    },

    endRefresh() {
      isRefreshInFlight = false;
    },

    /** A hold on the button for one pass, a no-op where the pass does not turn it. */
    turn(turnsButton: boolean): Turn {
      let floor: Promise<void> | undefined;
      return {
        start() {
          if (!turnsButton || floor != null) return;
          passesRunning += 1;
          publish.refreshing(true);
          floor = delay(REFRESHING_FLOOR_MS);
        },
        async stop() {
          if (floor == null) return;
          const held = floor;
          floor = undefined;
          await held;
          passesRunning -= 1;
          if (passesRunning === 0) publish.refreshing(false);
        },
      };
    },

    beginFetching(leagues: ReadonlyArray<LeagueKey>) {
      leagues.forEach((key) => {
        const league = ESPN_LEAGUE[key];
        fetchCounts.set(league, (fetchCounts.get(league) ?? 0) + 1);
      });
      publishFetching();
    },

    /** Counts the fetch asked for at `asked` down once the floor has passed. */
    endFetching(leagues: ReadonlyArray<LeagueKey>, asked: number) {
      const timer = setTimeout(
        () => {
          fetchTimers.delete(timer);
          leagues.forEach((key) => {
            const league = ESPN_LEAGUE[key];
            fetchCounts.set(
              league,
              Math.max((fetchCounts.get(league) ?? 1) - 1, 0),
            );
          });
          publishFetching();
        },
        Math.max(REFRESHING_FLOOR_MS - (Date.now() - asked), 0),
      );
      fetchTimers.add(timer);
    },

    /**
     * Holds a rescore back while a pass runs, and answers whether it did. Both
     * leagues where either request named none, since an unnamed rescore asks for
     * every league. Otherwise the union, so a reader who opens a second game does
     * not drop the first one's league on the floor.
     */
    deferRescore(leagues?: ReadonlyArray<League>): boolean {
      if (!isAttemptInFlight && !isRefreshInFlight) return false;
      const waiting = pending ? pending.leagues : leagues;
      pending = {
        leagues:
          leagues == null || waiting == null
            ? undefined
            : [...new Set([...waiting, ...leagues])],
      };
      return true;
    },

    forgetRescore() {
      pending = undefined;
    },

    /** What `drainRescore` runs. */
    setRescore(next: Rescore) {
      rescore = next;
    },

    /**
     * Runs a rescore a pass turned away, now that that pass is over. Called at
     * the end of every pass, since the two flags a rescore yields to are cleared
     * in two different places.
     */
    drainRescore() {
      if (pending == null) return;
      void rescore?.(pending.leagues);
    },

    dispose() {
      fetchTimers.forEach((timer) => clearTimeout(timer));
    },
  };
}

export type ScoringPasses = ReturnType<typeof createScoringPasses>;
