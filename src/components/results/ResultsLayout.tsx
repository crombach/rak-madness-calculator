import { Outlet, useMatch, useNavigate, useParams } from "react-router";
import { useAppData } from "../../context/AppDataContext";
import useWeekRouteGuard from "../../hooks/useWeekRouteGuard";
import ResultsFrame from "./ResultsFrame";
import resultsPath, { RESULTS_PAGE, ResultsPage } from "./resultsPath";

/**
 * Chrome for a week's results, shared by every page of them.
 *
 * A layout route rather than a piece of each view, so switching between the
 * scoreboard and the picks does not remount the refresh button and drop the
 * refresh it is running.
 */
export default function ResultsLayout() {
  const { season: seasonParam, week: weekParam } = useParams();
  const navigate = useNavigate();
  const { refresh, rescore, isRefreshing, fetchingLeagues, scores } =
    useAppData();
  const guard = useWeekRouteGuard(seasonParam, weekParam);

  // The route decides which view is showing, not component state.
  const isPicks = useMatch("/:season/:week/picks") != null;
  const isSwings = useMatch("/:season/:week/swings") != null;
  const isLive = useMatch("/:season/:week/live") != null;
  const isCompare = useMatch("/:season/:week/compare") != null;
  const view: ResultsPage = isSwings
    ? RESULTS_PAGE.swingGames
    : isLive
      ? RESULTS_PAGE.liveGames
      : isCompare
        ? RESULTS_PAGE.comparePlayers
        : isPicks
          ? RESULTS_PAGE.picks
          : RESULTS_PAGE.scoreboard;

  return (
    <ResultsFrame
      view={view}
      isReady={guard.status === "ready"}
      // Leaving a menu page pushes, so Back returns to it. The menu pushed it, so
      // a replace would leave two entries for the page before it.
      onViewChange={(next) =>
        navigate(resultsPath(seasonParam, weekParam, next), {
          replace: !isSwings && !isLive && !isCompare,
        })
      }
      onRefresh={refresh}
      onPoll={rescore}
      isRefreshing={isRefreshing}
      fetchingLeagues={fetchingLeagues}
      scores={scores}
    >
      <Outlet />
    </ResultsFrame>
  );
}
