import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router";
import HomePage from "./components/home/HomePage";
import CurrentWeekRedirect from "./components/results/CurrentWeekRedirect";
import { RESULTS_PAGE } from "./components/results/resultsPath";
import PicksRoute from "./components/results/PicksRoute";
import ResultsLayout from "./components/results/ResultsLayout";
import ScoreboardRoute from "./components/results/ScoreboardRoute";
import LiveGamesPage from "./components/liveGames/LiveGamesPage";
import SwingGamesSkeleton from "./components/swingGames/SwingGamesSkeleton";
import HeadToHeadSkeleton from "./components/headToHead/HeadToHeadSkeleton";

// Lazy for the must-win search it reaches, which `ResultsFrame` keeps out of the
// chunk every route waits on.
const SwingGamesRoute = lazy(
  () => import("./components/swingGames/SwingGamesRoute"),
);
// Lazy for Base UI's combobox, which `ResultsFrame` keeps out of that chunk too.
const HeadToHeadRoute = lazy(
  () => import("./components/headToHead/HeadToHeadRoute"),
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      {/* Bookmarkable shortcuts to the latest week worth showing. */}
      <Route
        path="/scoreboard"
        element={<CurrentWeekRedirect view={RESULTS_PAGE.scoreboard} />}
      />
      <Route
        path="/picks"
        element={<CurrentWeekRedirect view={RESULTS_PAGE.picks} />}
      />
      <Route path="/:season/:week" element={<ResultsLayout />}>
        <Route index element={<Navigate to="scoreboard" replace />} />
        <Route path="scoreboard" element={<ScoreboardRoute />} />
        <Route path="picks" element={<PicksRoute />} />
        <Route
          path="swings"
          element={
            <Suspense fallback={<SwingGamesSkeleton />}>
              <SwingGamesRoute />
            </Suspense>
          }
        />
        <Route path="live" element={<LiveGamesPage />} />
        <Route
          path="compare"
          element={
            <Suspense fallback={<HeadToHeadSkeleton />}>
              <HeadToHeadRoute />
            </Suspense>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
