import { Navigate, Route, Routes } from "react-router";
import HomePage from "./components/home/HomePage";
import CurrentWeekRedirect from "./components/results/CurrentWeekRedirect";
import { RESULTS_PAGE } from "./components/results/resultsPath";
import PicksRoute from "./components/results/PicksRoute";
import ResultsLayout from "./components/results/ResultsLayout";
import ScoreboardRoute from "./components/results/ScoreboardRoute";
import { GamesPage } from "./components/games/GamesPage";
import { knockoutsPage } from "./components/knockouts/KnockoutsPage";
import { comparePlayersPage } from "./components/comparePlayers/ComparePlayersPage";

const { Page: KnockoutsPage } = knockoutsPage;
const { Page: ComparePlayersPage } = comparePlayersPage;

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
        <Route path="knockouts" element={<KnockoutsPage />} />
        <Route path="games" element={<GamesPage />} />
        <Route path="compare" element={<ComparePlayersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
