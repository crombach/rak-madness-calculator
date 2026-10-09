import { useCallback, useMemo } from "react";
import {
  Navigate,
  Outlet,
  useMatch,
  useNavigate,
  useParams,
} from "react-router";
import { useScores, useScoringStatus } from "../../context/AppDataContext";
import useWeekRouteGuard from "../../hooks/useWeekRouteGuard";
import CurrentWeekRedirect from "./CurrentWeekRedirect";
import ResultsFrame from "./ResultsFrame";
import resultsPath, {
  PAGES,
  RESULTS_PAGE,
  ScoresView,
  pageForSegment,
} from "./resultsPath";

/**
 * Chrome for a week's results, shared by every page of them.
 *
 * A layout route rather than a piece of each view, so switching between the
 * scoreboard and the picks does not remount the refresh button and drop the
 * refresh it is running.
 *
 * The shortcut routes and a bare week URL render this too and redirect from
 * beside the frame, so one frame stays mounted, wireframe up, until the page lands.
 */
export default function ResultsLayout({
  shortcutView,
}: {
  /** Set by `/scoreboard` and `/picks`, which name no week yet. */
  shortcutView?: ScoresView;
}) {
  const { season: seasonParam, week: weekParam } = useParams();
  const navigate = useNavigate();
  const { refresh, isRefreshing } = useScoringStatus();
  const scores = useScores();
  const guard = useWeekRouteGuard(seasonParam, weekParam);

  // The route decides which view is showing, not component state.
  const segment = useMatch("/:season/:week/:page")?.params.page;
  const view = shortcutView ?? pageForSegment(segment);
  const isBareWeek = shortcutView == null && segment == null;

  // Leaving a menu page pushes, so Back returns to it. The menu pushed it, so a
  // replace would leave two entries for the page before it.
  const isMenuPage = PAGES[view].isMenuOnly;
  const onViewChange = useCallback(
    (next: ScoresView) =>
      navigate(resultsPath(seasonParam, weekParam, next), {
        replace: !isMenuPage,
      }),
    [navigate, seasonParam, weekParam, isMenuPage],
  );

  // Held once so the memoized frame skips renders the scoring flags cause.
  const page = useMemo(() => <Outlet />, []);

  return (
    <>
      <ResultsFrame
        view={view}
        isReady={guard.status === "ready" && !isBareWeek}
        hasFailed={guard.status === "failed"}
        onViewChange={onViewChange}
        onRefresh={refresh}
        isRefreshing={isRefreshing}
        scores={scores}
      >
        {page}
      </ResultsFrame>
      {shortcutView && <CurrentWeekRedirect view={shortcutView} />}
      {isBareWeek && (
        <Navigate
          replace
          to={resultsPath(seasonParam, weekParam, RESULTS_PAGE.scoreboard)}
        />
      )}
    </>
  );
}
