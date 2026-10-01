import {
  useScores,
  useScoringStatus,
  useSwingGames,
} from "../../context/AppDataContext";
import ExperimentalGate from "../results/ExperimentalGate";
import SwingGames from "./SwingGames";

function SwingGamesPage() {
  const { rescore, fetchingLeagues } = useScoringStatus();
  return (
    <SwingGames
      scores={useScores()}
      swings={useSwingGames()}
      onPoll={rescore}
      fetchingLeagues={fetchingLeagues}
    />
  );
}

// Swing Games shows only to a reader who opted in to experimental features.
export default function SwingGamesRoute() {
  return (
    <ExperimentalGate>
      <SwingGamesPage />
    </ExperimentalGate>
  );
}
