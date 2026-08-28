import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useLocation } from "react-router";
import useCurrentSeason from "../hooks/useCurrentSeason";
import useLeagueWeeks from "../hooks/useLeagueWeeks";
import usePicksSeasons from "../hooks/usePicksSeasons";
import usePlayerScores from "../hooks/usePlayerScores";
import { WeekInfo } from "../types/League";
import isWinnerDecided from "../utils/scoring/isWinnerDecided";
import { NO_SCORE_CHANGES, ScoreChanges } from "../utils/scoring/scoreChanges";

type AppData = ReturnType<typeof useLeagueWeeks> &
  Omit<ReturnType<typeof usePlayerScores>, "scoreChanges"> &
  ReturnType<typeof usePicksSeasons> & {
    /**
     * The `WeekInfo` for a week number, or undefined if the season has no such
     * week. Always the calendar's own object: the week picker compares options by
     * reference, so a rebuilt one would leave it unable to show a selection.
     */
    findWeek: (value: number) => WeekInfo | undefined;
    /** Which season the user is looking at, by the year it started in. */
    setSelectedSeason: (season: number) => void;
    /**
     * The season being asked for, which is the one the picker should show.
     * `loadedSeason` is the season already loaded, so the two differ for the
     * length of a switch.
     */
    requestedSeason?: number;
    /**
     * The seasons that can be chosen, newest first. The ones with picks in the
     * database, plus the season running now whether or not it has any.
     */
    selectableSeasons: Array<number>;
  };

const AppDataContext = createContext<AppData | undefined>(undefined);

/**
 * Whether the week on screen is over, so whoever is left standing has won.
 *
 * Its own context rather than a field on `AppData`, because every player cell
 * reads it. On `AppData` they would each re-render on every loading flag the app
 * data carries, which is the same reason the toast list and its actions are
 * split. False with no provider above, so a table can still be rendered on its
 * own with scores handed straight to it.
 */
const WinnerDecidedContext = createContext(false);

/**
 * What the most recent scoring attempt changed, so a table can flash only the
 * cells that moved. Its own context for the same reason `WinnerDecidedContext` is:
 * every pick and player cell reads it, and `AppData` re-renders on every loading
 * flag it carries.
 */
const ScoreChangesContext = createContext<ScoreChanges>(NO_SCORE_CHANGES);

/** The season and week a results URL names, from `/<year>/<week>/…`. Empty elsewhere. */
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
  // Undefined until a URL or the picker names one, which is what asks ESPN for
  // the season running now. `loadedSeason` then comes back saying which one that
  // was.
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
  // the season ESPN calls current between the Super Bowl and the opener: nothing
  // of it has been played, so `useCurrentSeason` withholds it too.
  const requestedSeason = selectedSeason ?? picksSeasons.seasons?.[0];
  const leagueWeeks = useLeagueWeeks(
    route.weekNumber,
    requestedSeason,
    !picksSeasons.isSeasonsLoading,
  );
  const playerScores = usePlayerScores(
    leagueWeeks.selectedWeek,
    leagueWeeks.loadedSeason,
  );
  const { weeks } = leagueWeeks;

  const findWeek = useCallback(
    (value: number) => weeks?.find((week) => week.value === value),
    [weeks],
  );

  const { scores, scoreChanges } = playerScores;
  const winnerDecided = useMemo(
    () => scores != null && isWinnerDecided(scores),
    [scores],
  );

  // The seasons with picks, plus the one running now whether or not it has any.
  // That season's weeks are scored from a spreadsheet the user uploads until its
  // picks reach the database, and leaving it out puts the week they are holding
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

  const value = useMemo(
    () => ({
      ...leagueWeeks,
      ...playerScores,
      ...picksSeasons,
      findWeek,
      setSelectedSeason,
      requestedSeason,
      selectableSeasons,
    }),
    [
      leagueWeeks,
      playerScores,
      picksSeasons,
      findWeek,
      requestedSeason,
      selectableSeasons,
    ],
  );

  return (
    <AppDataContext.Provider value={value}>
      <WinnerDecidedContext.Provider value={winnerDecided}>
        <ScoreChangesContext.Provider value={scoreChanges}>
          {children}
        </ScoreChangesContext.Provider>
      </WinnerDecidedContext.Provider>
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppData {
  const value = useContext(AppDataContext);
  if (value == null) {
    throw new Error("useAppData needs an AppDataContextProvider above it");
  }
  return value;
}

export function useIsWinnerDecided(): boolean {
  return useContext(WinnerDecidedContext);
}

export function useScoreChanges(): ScoreChanges {
  return useContext(ScoreChangesContext);
}
