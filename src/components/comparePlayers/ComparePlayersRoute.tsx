import { Navigate, useParams } from "react-router";
import { useAppData } from "../../context/AppDataContext";
import { useSettings } from "../../context/SettingsContext";
import resultsPath, { RESULTS_PAGE } from "../results/resultsPath";
import ComparePlayers from "./ComparePlayers";

export default function ComparePlayersRoute() {
  const { season, week } = useParams();
  const { scores } = useAppData();
  const { experimentalFeatures } = useSettings();
  if (!experimentalFeatures) {
    return (
      <Navigate
        replace
        to={resultsPath(season, week, RESULTS_PAGE.scoreboard)}
      />
    );
  }
  // A new week seeds the pickers afresh from that week's rows.
  return <ComparePlayers key={`${season}-${week}`} scores={scores} />;
}
