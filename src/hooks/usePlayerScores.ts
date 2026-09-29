import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Toast,
  errorToast,
  successToast,
  useToastActions,
} from "../context/ToastContext";
import { League, WeekInfo } from "../types/League";
import { RakMadnessScores } from "../types/RakMadnessScores";
import loadStoredPicks, { takePrefetchedPicks } from "../utils/loadStoredPicks";
import { writeCachedPicks } from "../utils/picksCache";
import { readFileToBuffer } from "../utils/readFileToBuffer";
import { LEAGUES, LeagueKey } from "../utils/scoring/gameColumns";
import { getPlayerScores } from "../utils/scoring/getPlayerScores";
import {
  fetchLeagueResults,
  hasMoved,
  LEAGUE_KEY,
  LeagueResults,
} from "../utils/scoring/leagueResults";
import parsePicksWorkbook from "../utils/scoring/parsePicksWorkbook";
import { createScoringPasses, NO_LEAGUES } from "./scoringPasses";
import scoreChanges, {
  NO_SCORE_CHANGES,
  ScoreChanges,
} from "../utils/scoring/scoreChanges";

/**
 * How long the score changes stay on offer.
 *
 * The `--rak-duration-slow` run of `.table__cell-wipe` in `Table.scss`, plus a
 * frame of slack. Taken back once it is over, so a table mounted later does not
 * replay a wipe the reader already watched. Leaving a table for the homepage and
 * coming back does that, and so does switching between the two tables.
 */
export const WIPE_LIFETIME_MS = 350;

/** The season and week a scoring attempt has finished, however it turned out. */
type LastAttempt = { season: number; weekNumber: number };

/** What a failed scoring pass says, in its toast and on the page it left empty. */
export function scoringFailedMessage(weekNumber: number | string): string {
  return `Failed to calculate scores for week ${weekNumber}.`;
}

/** Scoring threw on picks the app already had, which every path can hit. */
function scoringFailed(weekNumber: number): Toast {
  return errorToast(scoringFailedMessage(weekNumber));
}

/** A refresh that could not reach the sheet. The scores on screen still stand. */
function refreshFailed(weekNumber: number): Toast {
  return errorToast(`Failed to refresh week ${weekNumber} picks.`);
}

/** The three steps of a pass, in order. */
type Stage = "load" | "fetch" | "score";

/** A step that threw, and which one it was. */
class StageFailure {
  readonly stage: Stage;
  readonly cause: unknown;
  constructor(stage: Stage, cause: unknown) {
    this.stage = stage;
    this.cause = cause;
  }
}

/** Thrown past the rest of a pass a newer attempt has replaced. */
const SUPERSEDED = Symbol("superseded");

/** What each failed step logs. */
function logFailure({ stage, cause }: StageFailure, weekNumber: number) {
  if (stage === "load") {
    console.warn(
      `Failed to load week ${weekNumber} picks spreadsheet. Has it been uploaded yet?`,
      cause,
    );
  } else if (stage === "fetch") {
    console.warn(`Failed to fetch the week ${weekNumber}`, cause);
  } else {
    console.error("Failed to calculate scores", cause);
  }
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
  // The week whose games could not be fetched or scored, with no scores for it on
  // screen. A week missing its picks is left out, since uploading them is the fix.
  const [failedFor, setFailedFor] = useState<LastAttempt>();
  const [isScoresLoading, setScoresLoading] = useState(true);
  const [isRefreshing, setRefreshing] = useState(false);
  const [fetchingLeagues, setFetchingLeagues] =
    useState<ReadonlySet<League>>(NO_LEAGUES);
  const [passes] = useState(() =>
    createScoringPasses({
      refreshing: setRefreshing,
      fetching: setFetchingLeagues,
    }),
  );
  // Counts scoring attempts, so a superseded one cannot write its scores over the
  // week that replaced it. Two can be in flight when the week changes mid-load.
  const latestAttempt = useRef(0);
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

  useEffect(() => () => passes.dispose(), [passes]);

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

  // Both failure branches drop the same three, and a stale score change outliving
  // the scores it described is what a partial reset would leave behind.
  const clearScores = useCallback(() => {
    setScores(undefined);
    previousScores.current = undefined;
    showScoreChanges(NO_SCORE_CHANGES);
  }, [showScoreChanges]);

  // Every path into the scores runs through here, so the loading flags and the
  // failure toasts cannot drift between them. Load, fetch, score, each step
  // leaving by `SUPERSEDED` once a newer attempt has started.
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
      passes.setAttemptInFlight(true);
      setScoresLoading(true);

      const attempted = { season, weekNumber: selectedWeek.value };
      const key = `${attempted.season}:${attempted.weekNumber}`;

      // A reader's pass turns the button before it reads anything, so a refresh
      // waiting on the sheet still says so while a poll pass runs beside it. A
      // poll's own pass turns it only once the gate has let it through, since a
      // week nothing moved in is not a refresh the reader should see. The scores
      // go up as soon as they are worked out. Only the button waits for its floor.
      const turn = passes.turn(turnsButton);
      if (!gateOnMovement) turn.start();

      const step = async <T>(stage: Stage, run: () => Promise<T>) => {
        let value: T;
        try {
          value = await run();
        } catch (error) {
          throw isLatest() ? new StageFailure(stage, error) : SUPERSEDED;
        }
        if (!isLatest()) throw SUPERSEDED;
        return value;
      };

      // Set once the pass reaches scoring, and handed back however that ends.
      let scoredResults: LeagueResults | undefined;
      try {
        const buffer = await step("load", loadPicks);
        setPicksBuffer(buffer);

        const held =
          heldResults.current?.key === key
            ? heldResults.current.results
            : undefined;
        const asked = Date.now();
        passes.beginFetching(leagues);
        const fetched = await step("fetch", async () => {
          try {
            const parsed = await parsePicksWorkbook(buffer);
            return await fetchLeagueResults({
              leagues,
              week: selectedWeek,
              season,
              matchups: {
                college: parsed.collegeMatchups,
                pro: parsed.proMatchups,
              },
              held,
            });
          } finally {
            passes.endFetching(leagues, asked);
          }
        });

        if (gateOnMovement && !hasMoved(leagues, held, fetched)) {
          // Nothing to score, so the week on screen already stands for this fetch.
          heldResults.current = { key, results: fetched };
          return fetched;
        }
        turn.start();
        scoredResults = fetched;

        const nextScores = await step("score", () =>
          getPlayerScores(selectedWeek, buffer, season, fetched),
        );
        // Advanced by a pass that scored, and by that pass alone. A move is seen
        // once, since the pass that scores it replaces what it was measured
        // against. A pass whose scoring threw leaves the baseline where it was,
        // so the next one sees the move again rather than gating the week behind
        // a failure.
        heldResults.current = { key, results: fetched };
        const before =
          previousScores.current?.key === key
            ? previousScores.current.scores
            : undefined;
        showScoreChanges(scoreChanges(before, nextScores));
        previousScores.current = { key, scores: nextScores };
        setScores(nextScores);
        setFailedFor(undefined);
        if (onSuccess) showToast(onSuccess);
        return fetched;
      } catch (error) {
        if (error === SUPERSEDED) return scoredResults;
        const failure =
          error instanceof StageFailure
            ? error
            : new StageFailure("score", error);
        logFailure(failure, selectedWeek.value);
        if (!keepScoresOnFailure) clearScores();
        if (failure.stage !== "load" && previousScores.current?.key !== key) {
          setFailedFor(attempted);
        } else if (failure.stage === "load" && !keepScoresOnFailure) {
          setFailedFor(undefined);
        }
        // A load failure speaks even for a poll, whose picks are already in hand.
        if (failure.stage === "load") {
          showToast(onLoadFailure);
        } else if (!quietFailure) {
          showToast(onScoreFailure);
        }
        return scoredResults;
      } finally {
        if (isLatest()) {
          setScoresLoading(false);
          setAttemptedFor(attempted);
          passes.setAttemptInFlight(false);
          passes.drainRescore();
        }
        await turn.stop();
      }
    },
    [selectedWeek, season, passes, showToast, clearScores, showScoreChanges],
  );

  // A game that moved in the week the reader has left is not the week they moved
  // to. Declared over the effect that scores the new week, so the flag is
  // gone before that week's own pass could drain it.
  useEffect(() => {
    passes.forgetRescore();
  }, [selectedWeek, season, passes]);

  useEffect(() => {
    if (!selectedWeek || season == null) return;
    const scoreStoredPicks = async () =>
      attemptScoring({
        loadPicks: () =>
          takePrefetchedPicks(season, selectedWeek) ??
          loadStoredPicks(season, selectedWeek),
        onLoadFailure: new Toast(
          "warning",
          "Missing Picks",
          `The picks spreadsheet for week ${selectedWeek.value} is not yet in the picks store, but you can use a local spreadsheet if you have one.`,
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
   * and fires on every release, so `beginRefresh` is what turns a second one
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
        // picks store.
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
    if (!passes.beginRefresh()) return;
    try {
      await scoreWeek(true);
    } finally {
      passes.endRefresh();
      passes.drainRescore();
    }
  }, [scoreWeek, passes]);

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
      if (passes.deferRescore(leagues)) return undefined;
      passes.forgetRescore();
      return scoreWeek(
        false,
        leagues?.map((league) => LEAGUE_KEY[league]) ?? LEAGUES,
      );
    },
    [scoreWeek, passes],
  );

  useEffect(() => {
    passes.setRescore(rescore);
  }, [rescore, passes]);

  return useMemo(
    () => ({
      scores,
      scoreChanges: scoreChangesState,
      attemptedFor,
      failedFor,
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
      failedFor,
      isScoresLoading,
      isRefreshing,
      fetchingLeagues,
      scoreLocalFile,
      refresh,
      rescore,
    ],
  );
}
