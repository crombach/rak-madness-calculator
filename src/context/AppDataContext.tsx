import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation } from "react-router";
import useCurrentSeason from "../hooks/useCurrentSeason";
import useLeagueWeeks from "../hooks/useLeagueWeeks";
import usePicksSeasons from "../hooks/usePicksSeasons";
import usePlayerScores from "../hooks/usePlayerScores";
import { WeekInfo } from "../types/League";
import { prefetchStoredPicks } from "../utils/loadStoredPicks";
import { RakMadnessScores } from "../types/RakMadnessScores";
import { NO_SWINGS, SwingGames } from "../utils/scoring/swingGameTypes";
import cachedImport from "../utils/cachedImport";
import isWeekSettled, { isWeekWon } from "../utils/scoring/isWeekSettled";
import { readSettledWeek } from "../utils/settledWeeksCache";
import { NO_SCORE_CHANGES, ScoreChanges } from "../utils/scoring/scoreChanges";
import { useSettings } from "./SettingsContext";

/** The season and week lists, and which of each is selected. */
type Calendar = ReturnType<typeof useLeagueWeeks> &
  ReturnType<typeof usePicksSeasons> & {
    /**
     * The `WeekInfo` for a week number, or undefined if the season has no such
     * week. Always the calendar's own object. The week picker compares options by
     * reference, so a rebuilt one would leave it unable to show a selection.
     */
    findWeek: (value: number) => WeekInfo | undefined;
    /** Which season the user is looking at. */
    setSelectedSeason: (season: number) => void;
    /**
     * The season being asked for, which is the one the picker should show.
     * `loadedSeason` is the season already loaded, so the two differ for the
     * length of a switch.
     */
    requestedSeason?: number;
    /**
     * The seasons that can be chosen, newest first. The ones with picks in the
     * picks store, plus the season running now whether or not it has any.
     */
    selectableSeasons: Array<number>;
  };

/** The flags and actions of the scoring pass, which change far more than the scores do. */
type ScoringStatus = Omit<
  ReturnType<typeof usePlayerScores>,
  "scores" | "scoreChanges"
>;

/*
  Three contexts rather than one, so a consumer re-renders only for what it reads.
  The scoring flags change on every refresh and every twenty-second poll, and a
  table that reads `scores` has no use for them. `WeekOutcomeContext` and
  `ScoreChangesContext` below split off further for the same reason.
*/
const CalendarContext = createContext<Calendar | undefined>(undefined);
const ScoresContext = createContext<RakMadnessScores | undefined>(undefined);
const ScoringStatusContext = createContext<ScoringStatus | undefined>(
  undefined,
);

/**
 * How the week on screen stands. `isSettled` is every game settled, so whoever is
 * left standing has won. `isWon` is a winner known, games left or not, so the one
 * left standing wears the trophy.
 *
 * Its own context rather than a field on `ScoringStatus`, because every player
 * cell reads it. There they would each re-render on every loading flag, which is
 * the same reason the toast list and its actions are split. Both false with no provider above, so a table can still be rendered on its
 * own with scores handed straight to it.
 */
type WeekOutcome = { isSettled: boolean; isWon: boolean };

const NO_OUTCOME: WeekOutcome = { isSettled: false, isWon: false };

const SETTLED_OUTCOME: WeekOutcome = { isSettled: true, isWon: true };

const WeekOutcomeContext = createContext<WeekOutcome>(NO_OUTCOME);

/**
 * What the most recent scoring attempt changed, so a table can flash only the
 * cells that moved. Its own context for the same reason `WeekOutcomeContext` is.
 * Every pick and player cell reads it, and `ScoringStatus` changes on every loading
 * flag.
 */
const ScoreChangesContext = createContext<ScoreChanges>(NO_SCORE_CHANGES);

/** The season and week a results URL names, from `/<season>/<week>/…`. Empty elsewhere. */
function routeFromPath(pathname: string): {
  season?: number;
  weekNumber?: number;
} {
  const match = /^\/(\d{4})\/(\d+)/.exec(pathname);
  return match != null
    ? { season: Number(match[1]), weekNumber: Number(match[2]) }
    : {};
}

/**
 * The week list, the picks, and the scores, held above the routes.
 *
 * Mounted here rather than inside a route so that navigating between the home
 * page and a week's results does not refetch the ESPN calendar or throw away an
 * uploaded workbook. Refetching would also mint a new week list, which would
 * break the week picker's reference comparison.
 */
export function AppDataContextProvider({
  children,
}: PropsWithChildren<object>) {
  const { pathname } = useLocation();
  const route = routeFromPath(pathname);

  // The week a results URL opens on is known before the calendar arrives, so its
  // picks load beside the calendar rather than after it. Startup only.
  const [startRoute] = useState(route);
  useEffect(() => {
    if (startRoute.season != null && startRoute.weekNumber != null) {
      prefetchStoredPicks(startRoute.season, startRoute.weekNumber);
    }
  }, [startRoute]);
  // Undefined until a URL or the picker names one, which asks ESPN for the season
  // running now. `loadedSeason` then says which one that was.
  const [selectedSeason, setSelectedSeason] = useState(route.season);

  // A results URL is the last word on which season is being looked at. Adjusted
  // while rendering rather than in an effect, so the request below carries the
  // new season on the very render that navigates, instead of asking for the old
  // one first and throwing the answer away.
  const [seasonInUrl, setSeasonInUrl] = useState(route.season);
  if (route.season !== seasonInUrl) {
    setSeasonInUrl(route.season);
    if (route.season != null) {
      setSelectedSeason(route.season);
    }
  }

  const picksSeasons = usePicksSeasons();
  const currentSeason = useCurrentSeason();
  // The newest season with picks, unless the URL or the picker named one. Never
  // the season ESPN calls current between the Super Bowl and the opener. Nothing
  // of it has been played, so `useCurrentSeason` withholds it too.
  const requestedSeason = selectedSeason ?? picksSeasons.seasons?.[0];
  const leagueWeeks = useLeagueWeeks({
    initialWeekNumber: route.weekNumber,
    season: requestedSeason,
    enabled: !picksSeasons.isSeasonsLoading,
    picksWeeks: picksSeasons.picksWeeks(requestedSeason),
  });
  const playerScores = usePlayerScores(
    leagueWeeks.selectedWeek,
    leagueWeeks.loadedSeason,
  );
  const { weeks } = leagueWeeks;

  const findWeek = useCallback(
    (value: number) => weeks?.find((week) => week.value === value),
    [weeks],
  );

  const {
    scores,
    scoreChanges,
    attemptedFor,
    failedFor,
    isScoresLoading,
    isRefreshing,
    fetchingLeagues,
    scoreLocalFile,
    refresh,
    rescore,
  } = playerScores;
  // Until the week's scores arrive, a week this browser saw settled is taken as
  // still settled, so its results open without the refresh controls.
  const { season: routeSeason, weekNumber: routeWeekNumber } = route;
  const weekOutcome = useMemo(() => {
    if (scores != null) {
      return { isSettled: isWeekSettled(scores), isWon: isWeekWon(scores) };
    }
    return routeSeason != null &&
      routeWeekNumber != null &&
      readSettledWeek(routeSeason, routeWeekNumber)
      ? SETTLED_OUTCOME
      : NO_OUTCOME;
  }, [scores, routeSeason, routeWeekNumber]);

  // The seasons with picks, plus the one running now whether or not it has any.
  // That season's weeks are scored from a spreadsheet the reader uploads until its
  // picks reach the picks store, and leaving it out puts the week they are holding
  // out of reach. Falling back to the season the week list describes keeps the
  // picker usable where neither could be fetched, which is every `make run`, so
  // long as that season has a week behind it to score.
  const { loadedSeason, currentWeekNumber } = leagueWeeks;
  const selectableSeasons = useMemo(() => {
    const offered = new Set(picksSeasons.seasons ?? []);
    if (currentSeason != null) {
      offered.add(currentSeason);
    }
    if (
      offered.size === 0 &&
      loadedSeason != null &&
      currentWeekNumber != null
    ) {
      offered.add(loadedSeason);
    }
    return [...offered].sort((a, b) => b - a);
  }, [picksSeasons.seasons, currentSeason, loadedSeason, currentWeekNumber]);

  const calendar = useMemo(
    () => ({
      ...leagueWeeks,
      ...picksSeasons,
      findWeek,
      setSelectedSeason,
      requestedSeason,
      selectableSeasons,
    }),
    [leagueWeeks, picksSeasons, findWeek, requestedSeason, selectableSeasons],
  );
  const status = useMemo(
    () => ({
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

  return (
    <CalendarContext.Provider value={calendar}>
      <ScoringStatusContext.Provider value={status}>
        <ScoresContext.Provider value={scores}>
          <WeekOutcomeContext.Provider value={weekOutcome}>
            <ScoreChangesContext.Provider value={scoreChanges}>
              {children}
            </ScoreChangesContext.Provider>
          </WeekOutcomeContext.Provider>
        </ScoresContext.Provider>
      </ScoringStatusContext.Provider>
    </CalendarContext.Provider>
  );
}

function useRequired<T>(value: T | undefined, hook: string): T {
  if (value == null) {
    throw new Error(`${hook} needs an AppDataContextProvider above it`);
  }
  return value;
}

/** The weeks, the seasons, and which of each is selected. */
export function useCalendar(): Calendar {
  return useRequired(useContext(CalendarContext), "useCalendar");
}

/** The week's scores. Changes when they do, not when a loading flag does. */
export function useScores(): RakMadnessScores | undefined {
  return useContext(ScoresContext);
}

/** Whether the week is loading or refreshing, and the actions that score it. */
export function useScoringStatus(): ScoringStatus {
  return useRequired(useContext(ScoringStatusContext), "useScoringStatus");
}

export function useIsWeekSettled(): boolean {
  return useContext(WeekOutcomeContext).isSettled;
}

export function useIsWeekWon(): boolean {
  return useContext(WeekOutcomeContext).isWon;
}

export function useScoreChanges(): ScoreChanges {
  return useContext(ScoreChangesContext);
}

/** One answer per set of scores, however many callers ask for it. */
const swingGamesByScores = new WeakMap<RakMadnessScores, SwingGames>();

/**
 * Loaded on first use. `getSwingGames` pulls in all of `getPlayerAnalysis`, which
 * the routes would otherwise carry in the chunk every one of them waits on.
 */
const loadGetSwingGames = cachedImport(
  () => import("../utils/scoring/getSwingGames"),
);

/**
 * The week's swing games, or undefined while its scores or the code that reads
 * them load. Skips the work and answers empty, the same as a decided week, while
 * the reader has not opted into experimental features.
 */
export function useSwingGames(): SwingGames | undefined {
  const scores = useScores();
  const { experimentalFeatures } = useSettings();
  const [getSwingGames, setGetSwingGames] =
    useState<(scores: RakMadnessScores) => SwingGames>();
  const isNeeded = scores != null && experimentalFeatures;

  // Asks again on each new set of scores until the code arrives, so one failed
  // download costs one poll rather than the page.
  useEffect(() => {
    if (!isNeeded || getSwingGames != null) return;
    let isCurrent = true;
    loadGetSwingGames().then(
      (module) => {
        if (isCurrent) setGetSwingGames(() => module.default);
      },
      (error) => console.warn("Could not load the swing games", error),
    );
    return () => {
      isCurrent = false;
    };
  }, [isNeeded, scores, getSwingGames]);

  return useMemo(() => {
    if (scores == null) return undefined;
    if (!experimentalFeatures) return NO_SWINGS;
    let swings = swingGamesByScores.get(scores);
    if (swings == null && getSwingGames != null) {
      swings = getSwingGames(scores);
      swingGamesByScores.set(scores, swings);
    }
    return swings;
  }, [scores, experimentalFeatures, getSwingGames]);
}
