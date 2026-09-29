import { Navigate, useParams } from "react-router";
import { useAppData } from "../../context/AppDataContext";
import { useSettings } from "../../context/SettingsContext";
import resultsPath from "../results/resultsPath";
import LiveGames from "./LiveGames";

export default function LiveGamesRoute() {
  const { season, week } = useParams();
  const { scores, rescore } = useAppData();
  const { experimentalFeatures } = useSettings();
  if (!experimentalFeatures) {
    return <Navigate replace to={resultsPath(season, week, "Scoreboard")} />;
  }
  return <LiveGames scores={scores} onPoll={rescore} />;
}
