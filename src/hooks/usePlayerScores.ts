import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Toast,
  errorToast,
  successToast,
  useToastActions,
} from "../context/ToastContext";
import { League, WeekInfo } from "../types/League";
import { RakMadnessScores } from "../types/RakMadnessScores";
import loadStoredPicks from "../utils/loadStoredPicks";
import { writeCachedPicks } from "../utils/picksCache";
import { readFileToBuffer } from "../utils/readFileToBuffer";
import { LEAGUES, LeagueKey } from "../utils/scoring/gameColumns";
import { getPlayerScores } from "../utils/scoring/getPlayerScores";
import {
  ESPN_LEAGUE,
  fetchLeagueResults,
  hasMoved,
  LEAGUE_KEY,
  LeagueResults,
} from "../utils/scoring/leagueResults";
import parsePicksWorkbook from "../utils/scoring/parsePicksWorkbook";
import scoreChanges, {
  NO_SCORE_CHANGES,
  ScoreChanges,
} from "../utils/scoring/scoreChanges";

/**
 * The floor on how long a pass says it is running.
 *
 * Cleared at the later of this and the work finishing, so a slow pass turns the
 * refresh button, and lights the Game Status bar, for its whole run. A rescore of
 * the workbook in hand comes back in single milliseconds, and a button that spins
 * for that long reads as a button that did nothing.
 */
const REFRESHING_FLOOR_MS = 500;

/**
 * How long the score changes stay on offer.
 *
 * The `--rak-duration-slow` run of `.table__cell-wipe` in `Table.scss`, plus a
 * frame of slack. Taken back once it is over, so a table mounted later does not
 * replay a wipe the reader already watched. Leaving a table for the homepage and
 * coming back does that, and so does switching between the two tables.
 */
export const WIPE_LIFETIME_MS = 350;

/** Held still, so a render with nothing in flight is not a new object each time. */
const NO_LEAGUES: ReadonlySet<League> = new Set();

/** Resolves once `ms` has passed, so a caller can hold something open for it. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** The season and week a scoring attempt has finished, however it turned out. */
type LastAttempt = { season: number; weekNumber: number };

/** Scoring threw on picks the app already had, which every path can hit. */
function scoringFailed(weekNumber: number): Toast {
  return errorToast(`Failed to calculate scores for week ${weekNumber}.`);
}

/** A refresh that could not reach the sheet. The scores on screen still stand. */
function refreshFailed(weekNumber: number): Toast {
  return errorToast(`Failed to refresh week ${weekNumber} picks.`);
}

type ScoringRequest = {
  loadPicks: () => Promise<ArrayBuffer>;
  /** Shown when the picks could not be obtained at all. */
  onLoadFailure: Toast;
  /** Shown when the picks arrived but the week could not be fetched or scored. */
  onScoreFailure: Toast;
  onSuccess?: Toast;
  /**
   * Set on a refresh, where the scores already on screen are still the best
   * answer there is. Holds over both failures, the picks that never arrived and
   * the picks that would not score. Unset elsewhere, where scoring has never
   * succeeded for this week and there is nothing to fall back to.
   */
  keepScoresOnFailure?: boolean;
  /**
   * Which leagues to fetch. Every other league is taken from the pass before, so
   * a reader watching one game costs one scoreboard request rather than two.
   */
  leagues?: ReadonlyArray<LeagueKey>;
  /** Set by a poll, which nobody asked for and which says nothing when it fails. */
  quietFailure?: boolean;
  /**
   * Set by a poll: a week no game of the named leagues has moved in is left as it
   * stands, unscored. Unset by a reader's refresh, which reads the sheet again and
   * has to score whatever a correction to it changed.
   */
  gateOnMovement?: boolean;
  /** Turns the refresh button for as long as the pass runs, floored. */
  turnsButton?: boolean;
};

/**
 * The scores for a week, however the picks arrive: from the API, from this
 * browser's cache of an earlier upload, or from a file the user just chose.
 *
 * `season` names the picks in the API path and the cache, and is what the games
 * are scored against. Nothing is attempted until it is known.
 *
 * `attemptedFor` names the season and week this hook has finished trying, which
 * is not always the pair asked for. Switching either leaves the old scores in
 * place until the new ones arrive. Anything reacting to a missing score has to
 * wait for it to catch up, or it will act on the previous week's outcome. The
 * season belongs there as much as the week, since week 5 exists in every season.
 */
export default function usePlayerScores(
  selectedWeek?: WeekInfo,
  season?: number,
) {
  const { showToast, clearToasts } = useToastActions();

  const [picksBuffer, setPicksBuffer] = useState<ArrayBuffer>();
  const [scores, setScores] = useState<RakMadnessScores>();
  const [scoreChangesState, setScoreChangesState] =
    useState<ScoreChanges>(NO_SCORE_CHANGES);
  const [attemptedFor, setAttemptedFor] = useState<LastAttempt>();
  const [isScoresLoading, setScoresLoading] = useState(true);
  const [isRefreshing, setRefreshing] = useState(false);
  const [fetchingLeagues, setFetchingLeagues] =
    useState<ReadonlySet<League>>(NO_LEAGUES);
  // Counts scoring attempts, so a superseded one cannot write its scores over the
  // week that replaced it. Two can be in flight when the week changes mid-load.
  const latestAttempt = useRef(0);
  // Set for the length of an attempt, so a second click cannot start another one
  // before the state update announcing the first has even landed.
  const isAttemptInFlight = useRef(false);
  // Set for the length of a refresh a reader asked for. Only another of those is
  // turned away by it, which is what lets one supersede a rescore. It is also the
  // only thing that turns away a second pull, since a pull arms on the phone and
  // the week alone and fires on every release.
  const isRefreshInFlight = useRef(false);
  // How many passes are running. A refresh and a rescore can overlap, and the
  // rescore is far the quicker of the two, so the first one out must not stop the
  // button on behalf of the one still working.
  const passesRunning = useRef(0);
  // A rescore a pass in flight turned away, and the leagues it wanted. One flag
  // rather than a queue, since every rescore reads the same workbook against the
  // same week, so a second one would do the first one's work again.
  const isRescorePending = useRef(false);
  const pendingLeagues = useRef<ReadonlyArray<League> | undefined>(undefined);
  // `rescore` itself, so a pass can run the one it turned away on its way out.
  // Held in a ref because what drains it is `attemptScoring`, which `scoreWeek`
  // and `rescore` are both built on.
  const pendingRescore = useRef<
    ((leagues?: ReadonlyArray<League>) => Promise<unknown>) | undefined
  >(undefined);
  // The scores an attempt can be diffed against, and the week and season they are
  // for. A week or season switch leaves this behind, so the new week's first
  // score is never read as a change from the old week's last one.
  const previousScores = useRef<
    { key: string; scores: RakMadnessScores } | undefined
  >(undefined);
  // The games the scores on screen were built from, keyed the same way. Both the
  // leagues a pass did not fetch and the baseline `hasMoved` measures against come
  // from here.
  const heldResults = useRef<
    { key: string; results: LeagueResults } | undefined
  >(undefined);
  // Runs for the length of a wipe, and drops the changes behind it.
  const wipeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  // How many passes are fetching each league, and the timers holding those counts
  // up to the floor. Counted rather than flagged, so the first of two overlapping
  // passes cannot put the Game Status bar out while the second is still fetching.
  const fetchCounts = useRef(new Map<League, number>());
  const fetchTimers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const publishFetching = useCallback(() => {
    const live = new Set<League>();
    fetchCounts.current.forEach((count, league) => {
      if (count > 0) live.add(league);
    });
    setFetchingLeagues(live.size > 0 ? live : NO_LEAGUES);
  }, []);

  const beginFetching = useCallback(
    (leagues: ReadonlyArray<LeagueKey>) => {
      leagues.forEach((key) => {
        const league = ESPN_LEAGUE[key];
        fetchCounts.current.set(
          league,
          (fetchCounts.current.get(league) ?? 0) + 1,
        );
      });
      publishFetching();
    },
    [publishFetching],
  );

  const endFetching = useCallback(
    (leagues: ReadonlyArray<LeagueKey>, asked: number) => {
      const timer = setTimeout(
        () => {
          fetchTimers.current.delete(timer);
          leagues.forEach((key) => {
            const league = ESPN_LEAGUE[key];
            const count = fetchCounts.current.get(league) ?? 1;
            fetchCounts.current.set(league, Math.max(count - 1, 0));
          });
          publishFetching();
        },
        Math.max(REFRESHING_FLOOR_MS - (Date.now() - asked), 0),
      );
      fetchTimers.current.add(timer);
    },
    [publishFetching],
  );

  useEffect(
    () => () => {
      fetchTimers.current.forEach((timer) => clearTimeout(timer));
    },
    [],
  );

  // Hands the changes to the tables for as long as their wipe takes, then takes
  // them back. Nothing to take back where an attempt changed nothing, and no
  // timer is started for it.
  const showScoreChanges = useCallback((changes: ScoreChanges) => {
    clearTimeout(wipeTimer.current);
    setScoreChangesState(changes);
    if (changes.picks.size === 0 && changes.players.size === 0) return;
    wipeTimer.current = setTimeout(
      () => setScoreChangesState(NO_SCORE_CHANGES),
      WIPE_LIFETIME_MS,
    );
  }, []);

  useEffect(() => () => clearTimeout(wipeTimer.current), []);

  // Every path into the scores runs through here, so the loading flags and the
  // failure toasts cannot drift between them.
  // Both failure branches drop the same three, and a stale score change outliving
  // the scores it described is what a partial reset would leave behind.
  const clearScores = useCallback(() => {
    setScores(undefined);
    previousScores.current = undefined;
    showScoreChanges(NO_SCORE_CHANGES);
  }, [showScoreChanges]);

  // Runs a rescore a pass turned away, now that that pass is over. Called at the
  // end of every pass, since the two flags a rescore yields to are cleared in two
  // different places.
  const drainRescore = useCallback(() => {
    if (!isRescorePending.current) return;
    void pendingRescore.current?.(pendingLeagues.current);
  }, []);

  const attemptScoring = useCallback(
    async ({
      loadPicks,
      onLoadFailure,
      onScoreFailure,
      onSuccess,
      keepScoresOnFailure = false,
      leagues = LEAGUES,
      quietFailure = false,
      gateOnMovement = false,
      turnsButton = false,
    }: ScoringRequest): Promise<LeagueResults | undefined> => {
      if (!selectedWeek || season == null) return undefined;
      const attempt = ++latestAttempt.current;
      const isLatest = () => latestAttempt.current === attempt;
      isAttemptInFlight.current = true;
      setScoresLoading(true);

      const attempted = { season, weekNumber: selectedWeek.value };
      const key = `${attempted.season}:${attempted.weekNumber}`;

      // Turns the refresh button, and holds it turning for at least the floor.
      // A reader's pass turns it before it reads anything, so a refresh that is
      // waiting on the sheet still says so while a poll pass runs beside it. A
      // poll's own pass turns it only once the gate has let it through, since a
      // week nothing moved in is not a refresh the reader should see.
      let floor: Promise<void> | undefined;
      const startTurning = () => {
        if (!turnsButton || floor != null) return;
        passesRunning.current += 1;
        setRefreshing(true);
        floor = delay(REFRESHING_FLOOR_MS);
      };
      const stopTurning = async () => {
        if (floor == null) return;
        const held = floor;
        floor = undefined;
        // The scores go up as soon as they are worked out. Only the button waits,
        // so a refresh that lands at once still says it happened.
        await held;
        passesRunning.current -= 1;
        if (passesRunning.current === 0) {
          setRefreshing(false);
        }
      };
      if (!gateOnMovement) {
        startTurning();
      }

      // What every path out of here clears, plus the rescore a pass in flight
      // turned away.
      const finish = () => {
        setScoresLoading(false);
        setAttemptedFor(attempted);
        isAttemptInFlight.current = false;
        drainRescore();
      };

      let buffer: ArrayBuffer;
      try {
        buffer = await loadPicks();
        if (!isLatest()) {
          await stopTurning();
          return undefined;
        }
        setPicksBuffer(buffer);
      } catch (error) {
        if (!isLatest()) {
          await stopTurning();
          return undefined;
        }
        console.warn(
          `Failed to load week ${selectedWeek.value} picks spreadsheet. Has it been uploaded yet?`,
          error,
        );
        if (!keepScoresOnFailure) {
          clearScores();
        }
        finish();
        showToast(onLoadFailure);
        await stopTurning();
        return undefined;
      }

      const held =
        heldResults.current?.key === key
          ? heldResults.current.results
          : undefined;
      const asked = Date.now();
      let fetched: LeagueResults;
      beginFetching(leagues);
      try {
        const parsed = await parsePicksWorkbook(buffer);
        fetched = await fetchLeagueResults({
          leagues,
          week: selectedWeek,
          season,
          matchups: {
            college: parsed.collegeMatchups,
            pro: parsed.proMatchups,
          },
          held,
        });
      } catch (error) {
        endFetching(leagues, asked);
        if (!isLatest()) {
          await stopTurning();
          return undefined;
        }
        console.warn(`Failed to fetch the week ${selectedWeek.value}`, error);
        if (!keepScoresOnFailure) {
          clearScores();
        }
        finish();
        if (!quietFailure) {
          showToast(onScoreFailure);
        }
        await stopTurning();
        return undefined;
      }
      endFetching(leagues, asked);
      if (!isLatest()) {
        await stopTurning();
        return undefined;
      }

      // Measured before the baseline is replaced, and replaced in the same pass
      // that read it. A move can be seen once and never twice, however far behind
      // the scores the rescore it sets off runs.
      const moved = hasMoved(leagues, held, fetched);
      heldResults.current = { key, results: fetched };
      if (gateOnMovement && !moved) {
        finish();
        return fetched;
      }
      startTurning();

      try {
        const nextScores = await getPlayerScores(
          selectedWeek,
          buffer,
          season,
          fetched,
        );
        if (!isLatest()) return fetched;
        const before =
          previousScores.current?.key === key
            ? previousScores.current.scores
            : undefined;
        showScoreChanges(scoreChanges(before, nextScores));
        previousScores.current = { key, scores: nextScores };
        setScores(nextScores);
        if (onSuccess) {
          showToast(onSuccess);
        }
      } catch (error) {
        if (!isLatest()) return fetched;
        console.error("Failed to calculate scores", error);
        if (!keepScoresOnFailure) {
          clearScores();
        }
        showToast(onScoreFailure);
      } finally {
        if (isLatest()) {
          finish();
        }
        await stopTurning();
      }
      return fetched;
    },
    [
      selectedWeek,
      season,
      showToast,
      clearScores,
      showScoreChanges,
      drainRescore,
      beginFetching,
      endFetching,
    ],
  );

  // A game that moved in the week the reader has left is not the week they moved
  // to. Declared over the effect that scores the new week, so the flag is
  // gone before that week's own pass could drain it.
  useEffect(() => {
    isRescorePending.current = false;
    pendingLeagues.current = undefined;
  }, [selectedWeek, season]);

  useEffect(() => {
    if (!selectedWeek || season == null) return;
    const scoreStoredPicks = async () =>
      attemptScoring({
        loadPicks: () => loadStoredPicks(season, selectedWeek),
        onLoadFailure: new Toast(
          "warning",
          "Missing Picks",
          `The picks spreadsheet for week ${selectedWeek.value} is not yet in the database, but you can use a local spreadsheet if you have one.`,
        ),
        onScoreFailure: scoringFailed(selectedWeek.value),
      });
    scoreStoredPicks();
  }, [selectedWeek, season, attemptScoring]);

  const scoreLocalFile = useCallback(
    async (file?: File) => {
      if (!selectedWeek || season == null) return;
      // Dismissing the file dialog picked nothing, so it changes nothing. Results
      // already on screen stay there.
      if (!file) {
        showToast(
          new Toast("neutral", "Info", "Aborted picks spreadsheet selection"),
        );
        return;
      }
      // A file the user picked may not be a workbook at all, so reading it and
      // scoring it fail the same way as far as they are concerned.
      const failure = errorToast(
        "Failed to read picks from the spreadsheet you selected.",
      );
      await attemptScoring({
        loadPicks: async () => {
          const buffer = await readFileToBuffer(file);
          writeCachedPicks(season, selectedWeek.value, buffer);
          return buffer;
        },
        onLoadFailure: failure,
        onScoreFailure: failure,
        onSuccess: successToast("Generated results from picks spreadsheet"),
      });
    },
    [selectedWeek, season, attemptScoring, showToast],
  );

  /**
   * One pass over this week, on the sheet or on the workbook in hand.
   *
   * Nothing rate-limits this. `isRefreshing` holds the refresh button inert for as
   * long as a pass runs, and `REFRESHING_FLOOR_MS` keeps it set long enough to be
   * read, so the button cannot fire this twice over. A pull ignores `isRefreshing`
   * and fires on every release, so `isRefreshInFlight` is what turns a second one
   * away.
   */
  const scoreWeek = useCallback(
    async (
      refetch: boolean,
      leagues: ReadonlyArray<LeagueKey> = LEAGUES,
    ): Promise<LeagueResults | undefined> => {
      if (selectedWeek == null || season == null) return undefined;
      const inHand = picksBuffer;
      if (!refetch && inHand == null) return undefined;
      // Only where a reader asked. A poll runs on its own and has no business
      // taking down a message somebody is still reading.
      if (refetch) {
        clearToasts();
      }
      // Nothing said on success. The scores are on screen and the numbers that
      // moved are marked, so a toast over them repeats what the table already
      // shows and covers part of it to do so. A failure still speaks, since the
      // table looks the same either way when one happens.
      return attemptScoring({
        // A reader who asked reads the sheet again. It is rewritten when it turns
        // out to carry an error, so asking is how a correction reaches a live week
        // without a page load. A workbook the reader uploaded is replaced by it,
        // which is the point: the upload stands in until the week reaches the
        // database.
        //
        // A poll asks for none of that. It rescores what is in hand, since the
        // reader did not ask for anything and a sheet arriving under them is not
        // what a moved game means.
        loadPicks:
          !refetch && inHand != null
            ? async () => inHand
            : () => loadStoredPicks(season, selectedWeek),
        // A refresh that cannot reach the sheet says so and leaves the scores
        // alone. They came from the same week and are still the best answer there
        // is.
        onLoadFailure: refreshFailed(selectedWeek.value),
        onScoreFailure: scoringFailed(selectedWeek.value),
        keepScoresOnFailure: true,
        leagues,
        gateOnMovement: !refetch,
        quietFailure: !refetch,
        turnsButton: true,
      });
    },
    [picksBuffer, season, selectedWeek, attemptScoring, clearToasts],
  );

  /** The refresh a reader asks for, by the button or by a pull. Reads the sheet again. */
  const refresh = useCallback(async () => {
    // A ref rather than the `isScoresLoading` state. Two clicks in the same tick
    // would both still read the state as false, since the update announcing the
    // first click's attempt has not landed yet.
    //
    // Only another refresh blocks this one. A rescore running underneath is
    // superseded instead: `attemptScoring` numbers its attempts, so the reader's
    // wins and the poll's drops whatever order they finish in.
    //
    // A pull is what reaches this while a rescore runs. The button is inert for
    // the half second one holds `isRefreshing`, so a tap inside that window is
    // dropped by `Button` and never arrives. A pull ignores the flag and fires on
    // every release, and it is the gesture that has to end in the sheet.
    if (isRefreshInFlight.current) return;
    isRefreshInFlight.current = true;
    try {
      await scoreWeek(true);
    } finally {
      isRefreshInFlight.current = false;
      drainRescore();
    }
  }, [scoreWeek, drainRescore]);

  /**
   * What a poll asks for: the named leagues fetched, and the same workbook scored
   * against them if anything moved.
   *
   * Resolves to the games it fetched, so a caller watching one of them can show a
   * clock and a down that `hasMoved` deliberately ignores, without a second
   * request. A pass in flight turns this away, and it resolves to nothing.
   */
  const rescore = useCallback(
    async (
      leagues?: ReadonlyArray<League>,
    ): Promise<LeagueResults | undefined> => {
      // Nobody asked for this one, so it yields to anything already running rather
      // than superseding it. The request is held rather than dropped, and whichever
      // pass turned it away runs it on its way out. The poll asks once for each
      // state it finds, so it never asks again for a dropped one. The table would
      // keep the state before it until the reader refreshed.
      if (isAttemptInFlight.current || isRefreshInFlight.current) {
        isRescorePending.current = true;
        pendingLeagues.current = leagues;
        return undefined;
      }
      isRescorePending.current = false;
      pendingLeagues.current = undefined;
      return scoreWeek(
        false,
        leagues?.map((league) => LEAGUE_KEY[league]) ?? LEAGUES,
      );
    },
    [scoreWeek],
  );

  useEffect(() => {
    pendingRescore.current = rescore;
  }, [rescore]);

  return useMemo(
    () => ({
      scores,
      scoreChanges: scoreChangesState,
      attemptedFor,
      isScoresLoading,
      isRefreshing,
      fetchingLeagues,
      scoreLocalFile,
      refresh,
      rescore,
    }),
    [
      scores,
      scoreChangesState,
      attemptedFor,
      isScoresLoading,
      isRefreshing,
      fetchingLeagues,
      scoreLocalFile,
      refresh,
      rescore,
    ],
  );
}
