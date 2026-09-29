import { Navigate, useParams } from "react-router";
import { useAppData } from "../../context/AppDataContext";
import { useSettings } from "../../context/SettingsContext";
import resultsPath, { RESULTS_PAGE } from "../results/resultsPath";
import LiveGames from "./LiveGames";

export default function LiveGamesRoute() {
  const { season, week } = useParams();
  const { scores, rescore, fetchingLeagues } = useAppData();
  const { experimentalFeatures } = useSettings();
  if (!experimentalFeatures) {
    return (
      <Navigate
        replace
        to={resultsPath(season, week, RESULTS_PAGE.scoreboard)}
      />
    );
  }
  return (
    <LiveGames
      scores={scores}
      onPoll={rescore}
      fetchingLeagues={fetchingLeagues}
    />
  );
}
