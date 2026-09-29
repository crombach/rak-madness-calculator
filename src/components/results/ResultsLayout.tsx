import { Outlet, useMatch, useNavigate, useParams } from "react-router";
import { useScores, useScoringStatus } from "../../context/AppDataContext";
import useWeekRouteGuard from "../../hooks/useWeekRouteGuard";
import ResultsFrame from "./ResultsFrame";
import resultsPath, { PAGES, pageForSegment } from "./resultsPath";

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
  const { refresh, rescore, isRefreshing, fetchingLeagues } =
    useScoringStatus();
  const scores = useScores();
  const guard = useWeekRouteGuard(seasonParam, weekParam);

  // The route decides which view is showing, not component state.
  const view = pageForSegment(useMatch("/:season/:week/:page")?.params.page);

  return (
    <ResultsFrame
      view={view}
      isReady={guard.status === "ready"}
      // Leaving a menu page pushes, so Back returns to it. The menu pushed it, so
      // a replace would leave two entries for the page before it.
      onViewChange={(next) =>
        navigate(resultsPath(seasonParam, weekParam, next), {
          replace: !PAGES[view].isMenuOnly,
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
