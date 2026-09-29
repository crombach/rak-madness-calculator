import { Navigate, useParams } from "react-router";
import { useAppData } from "../../context/AppDataContext";
import { useSettings } from "../../context/SettingsContext";
import resultsPath, { RESULTS_PAGE } from "../results/resultsPath";
import HeadToHead from "./HeadToHead";

export default function HeadToHeadRoute() {
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
  return <HeadToHead scores={scores} />;
}
