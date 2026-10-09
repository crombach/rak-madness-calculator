import { Navigate, Route, Routes } from "react-router";
import HomePage from "./components/home/HomePage";
import AppNavbar from "./components/navbar/AppNavbar";
import { APP_NAME } from "./components/navbar/LogoButton";
import { RESULTS_PAGE } from "./components/results/resultsPath";
import PicksRoute from "./components/results/PicksRoute";
import ResultsLayout from "./components/results/ResultsLayout";
import ScoreboardRoute from "./components/results/ScoreboardRoute";
import doNothing from "./utils/doNothing";
import { gamesPage } from "./components/games/GamesPage";
import { knockoutsPage } from "./components/knockouts/KnockoutsPage";
import { comparePlayersPage } from "./components/comparePlayers/ComparePlayersPage";

const { Page: GamesPage } = gamesPage;
const { Page: KnockoutsPage } = knockoutsPage;
const { Page: ComparePlayersPage } = comparePlayersPage;

/**
 * An unknown URL, on its way home. Draws the home page's empty navbar while it
 * goes, so the screen is never blank, but none of the page itself.
 */
function UnknownRoute() {
  return (
    <>
      <AppNavbar
        title={APP_NAME}
        view={null}
        disabled
        noWeekYet
        isWeekLive={false}
        onViewChange={doNothing}
        season={undefined}
        week={undefined}
        pagesDisabled
      />
      <Navigate to="/" replace />
    </>
  );
}

export default function App() {
  return (
    <Routes>
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
    </Routes>
  );
}
