import { Navigate, Route, Routes } from "react-router";
import HomePage from "./components/home/HomePage";
import CurrentWeekRedirect from "./components/results/CurrentWeekRedirect";
import PicksRoute from "./components/results/PicksRoute";
import ResultsLayout from "./components/results/ResultsLayout";
import ScoreboardRoute from "./components/results/ScoreboardRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      {/* Bookmarkable shortcuts to the latest week worth showing. */}
      <Route
        path="/scoreboard"
        element={<CurrentWeekRedirect view="Scoreboard" />}
      />
      <Route path="/picks" element={<CurrentWeekRedirect view="Picks" />} />
      <Route path="/:season/:week" element={<ResultsLayout />}>
        <Route index element={<Navigate to="scoreboard" replace />} />
        <Route path="scoreboard" element={<ScoreboardRoute />} />
        <Route path="picks" element={<PicksRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
