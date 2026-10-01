import {
  useScores,
  useScoringStatus,
  useSwingGames,
} from "../../context/AppDataContext";
import SwingGames from "./SwingGames";

export default function SwingGamesRoute() {
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
