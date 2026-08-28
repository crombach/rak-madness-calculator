import throttle from "lodash.throttle";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Toast,
  errorToast,
  successToast,
  useToastActions,
} from "../context/ToastContext";
import { WeekInfo } from "../types/League";
import { RakMadnessScores } from "../types/RakMadnessScores";
import loadStoredPicks from "../utils/loadStoredPicks";
import { writeCachedPicks } from "../utils/picksCache";
import { readFileToBuffer } from "../utils/readFileToBuffer";
import { getPlayerScores } from "../utils/scoring/getPlayerScores";
import scoreChanges, {
  NO_SCORE_CHANGES,
  ScoreChanges,
} from "../utils/scoring/scoreChanges";

/** Long enough that holding the refresh button down sends one request. */
const REFRESH_THROTTLE_MS = 500;

/** The season and week a scoring attempt has finished, however it turned out. */
type LastAttempt = { season: number; week: number };

/** Scoring threw on picks the app already had, which every path can hit. */
function scoringFailed(week: number): Toast {
  return errorToast(`Failed to calculate scores for week ${week}.`);
}

type ScoringRequest = {
  loadPicks: () => Promise<ArrayBuffer>;
  /** Shown when the picks could not be obtained at all. */
  onLoadFailure: Toast;
  /** Shown when the picks arrived but scoring them threw. */
  onScoreFailure: Toast;
  onSuccess?: Toast;
  /**
   * Set on a refresh, where the scores already on screen came from the same
   * workbook and are still the best answer there is. Unset elsewhere, where
   * scoring has never succeeded for this week and there is nothing to fall back
   * to.
   */
  keepScoresOnFailure?: boolean;
};

/**
 * The scores for a week, however the picks arrive: from the API, from this
 * browser's cache of an earlier upload, or from a file the user just chose.
 *
 * `season` is the year the week's season started in. It names the picks in the
 * API path and the cache, and it is what the games are scored against, so a week
 * played in January still scores against the season it belongs to. Nothing is
 * attempted until it is known.
 *
 * `attemptedFor` names the season and week this hook has finished trying, which
 * is not always the pair asked for: switching either leaves the old scores in
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
  // Counts scoring attempts, so a superseded one cannot write its week's scores
  // over the week that replaced it. Two can be in flight whenever the selected
  // week changes while the first is still loading.
  const latestAttempt = useRef(0);
  // Set for the length of an attempt, so a second click cannot start another one
  // before the state update announcing the first has even landed.
  const isAttemptInFlight = useRef(false);
  // The scores an attempt can be diffed against, and the week and season they are
  // for. A week or season switch leaves this behind, so the new week's first
  // score is never read as a change from the old week's last one.
  const previousScores = useRef<
    { key: string; scores: RakMadnessScores } | undefined
  >(undefined);

  // Every path into the scores runs through here, so the loading flags and the
  // failure toasts cannot drift between them.
  // Both failure branches drop the same three, and a stale score change outliving
  // the scores it described is what a partial reset would leave behind.
  const clearScores = useCallback(() => {
    setScores(undefined);
    previousScores.current = undefined;
    setScoreChangesState(NO_SCORE_CHANGES);
  }, []);

  const attemptScoring = useCallback(
    async ({
      loadPicks,
      onLoadFailure,
      onScoreFailure,
      onSuccess,
      keepScoresOnFailure = false,
    }: ScoringRequest) => {
      if (!selectedWeek || season == null) return;
      const attempt = ++latestAttempt.current;
      const isLatest = () => latestAttempt.current === attempt;
      isAttemptInFlight.current = true;
      setScoresLoading(true);

      const attempted = { season, week: selectedWeek.value };
      const key = `${attempted.season}:${attempted.week}`;

      let buffer: ArrayBuffer;
      try {
        buffer = await loadPicks();
        if (!isLatest()) return;
        setPicksBuffer(buffer);
      } catch (error) {
        if (!isLatest()) return;
        console.warn(
          `Failed to load week ${selectedWeek.value} picks spreadsheet. Has it been uploaded yet?`,
          error,
        );
        clearScores();
        setAttemptedFor(attempted);
        setScoresLoading(false);
        isAttemptInFlight.current = false;
        showToast(onLoadFailure);
        return;
      }

      try {
        const weekScores = await getPlayerScores(selectedWeek, buffer, season);
        if (!isLatest()) return;
        const before =
          previousScores.current?.key === key
            ? previousScores.current.scores
            : undefined;
        setScoreChangesState(scoreChanges(before, weekScores));
        previousScores.current = { key, scores: weekScores };
        setScores(weekScores);
        if (onSuccess) {
          showToast(onSuccess);
        }
      } catch (error) {
        if (!isLatest()) return;
        console.error("Failed to calculate scores", error);
        if (!keepScoresOnFailure) {
          clearScores();
        }
        showToast(onScoreFailure);
      } finally {
        if (isLatest()) {
          setScoresLoading(false);
          setAttemptedFor(attempted);
          isAttemptInFlight.current = false;
        }
      }
    },
    [selectedWeek, season, showToast, clearScores],
  );

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

  // useMemo, not useCallback: the value is throttle()'s wrapper, not the
  // function literal, so useCallback cannot see its dependencies.
  const refreshThrottled = useMemo(
    () =>
      throttle(
        async () => {
          if (picksBuffer == null || selectedWeek == null) return;
          setRefreshing(true);
          clearToasts();
          // Refreshing rescores the workbook already in memory, so there is no
          // separate way for loading it to fail.
          const failure = scoringFailed(selectedWeek.value);
          try {
            await attemptScoring({
              loadPicks: async () => picksBuffer,
              onLoadFailure: failure,
              onScoreFailure: failure,
              onSuccess: successToast("Results successfully updated"),
              keepScoresOnFailure: true,
            });
          } finally {
            setRefreshing(false);
          }
          // No trailing edge: a second click inside the window is dropped rather
          // than queued, so it cannot fire a request of its own once the window
          // ends. `attemptInFlight` below is what actually blocks it meanwhile.
        },
        REFRESH_THROTTLE_MS,
        { trailing: false },
      ),
    [picksBuffer, selectedWeek, attemptScoring, clearToasts],
  );

  // Cancels a trailing call this throttle would otherwise still owe once the
  // component holding it is gone.
  useEffect(() => () => refreshThrottled.cancel(), [refreshThrottled]);

  const refresh = useCallback(async () => {
    // A ref rather than the `isScoresLoading` state, which two clicks in the same
    // tick would both still read as false: the state update announcing the first
    // click's attempt has not landed yet.
    if (isAttemptInFlight.current) return;
    await refreshThrottled();
  }, [refreshThrottled]);

  // Memoized so `AppDataContext` can memoize the value it publishes.
  return useMemo(
    () => ({
      scores,
      scoreChanges: scoreChangesState,
      attemptedFor,
      isScoresLoading,
      isRefreshing,
      scoreLocalFile,
      refresh,
    }),
    [
      scores,
      scoreChangesState,
      attemptedFor,
      isScoresLoading,
      isRefreshing,
      scoreLocalFile,
      refresh,
    ],
  );
}
