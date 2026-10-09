import { Navigate, Route, Routes } from "react-router";
import HomePage from "./components/home/HomePage";
import AppNavbar, { useNoWeekNavbar } from "./components/navbar/AppNavbar";
import { APP_NAME } from "./components/navbar/LogoButton";
import PageLayout from "./components/pageLayout/PageLayout";
import { RESULTS_PAGE } from "./components/results/resultsPath";
import PicksRoute from "./components/results/PicksRoute";
import ResultsLayout from "./components/results/ResultsLayout";
import ScoreboardRoute from "./components/results/ScoreboardRoute";
import { gamesPage } from "./components/games/GamesPage";
import { knockoutsPage } from "./components/knockouts/KnockoutsPage";
import { comparePlayersPage } from "./components/comparePlayers/ComparePlayersPage";

const { Page: GamesPage } = gamesPage;
const { Page: KnockoutsPage } = knockoutsPage;
const { Page: ComparePlayersPage } = comparePlayersPage;

/**
 * An unknown URL, on its way home. Leaves the home page's empty navbar up while
 * it goes, so the screen is never blank, but none of the page itself.
 */
function UnknownRoute() {
  useNoWeekNavbar();
  return (
    <>
      <PageLayout title={APP_NAME} />
      <Navigate to="/" replace />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppNavbar />}>
        <Route path="/" element={<HomePage />} />
        {/* Bookmarkable shortcuts to the latest week worth showing. They render the
            layout of the routes they redirect to, so one frame carries through. */}
        <Route
          path="/scoreboard"
          element={<ResultsLayout shortcutView={RESULTS_PAGE.scoreboard} />}
        />
        <Route
          path="/picks"
          element={<ResultsLayout shortcutView={RESULTS_PAGE.picks} />}
        />
        <Route path="/:season/:week" element={<ResultsLayout />}>
          <Route path="scoreboard" element={<ScoreboardRoute />} />
          <Route path="picks" element={<PicksRoute />} />
          <Route path="knockouts" element={<KnockoutsPage />} />
          <Route path="games" element={<GamesPage />} />
          <Route path="compare" element={<ComparePlayersPage />} />
        </Route>
        <Route path="*" element={<UnknownRoute />} />
      </Route>
    </Routes>
  );
}
