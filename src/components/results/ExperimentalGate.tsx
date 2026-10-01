import { PropsWithChildren } from "react";
import { Navigate, useParams } from "react-router";
import { useSettings } from "../../context/SettingsContext";
import resultsPath, { RESULTS_PAGE } from "./resultsPath";

/**
 * Shows its page only to a reader who has opted into experimental features.
 * Anyone else lands on the scoreboard.
 */
export default function ExperimentalGate({ children }: PropsWithChildren) {
  const { season, week } = useParams();
  const { experimentalFeatures } = useSettings();
  if (!experimentalFeatures) {
    return (
      <Navigate
        replace
        to={resultsPath(season, week, RESULTS_PAGE.scoreboard)}
      />
    );
  }
  return children;
}
