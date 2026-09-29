import { PropsWithChildren } from "react";
import { Navigate, useParams } from "react-router";
import { useSettings } from "../../context/SettingsContext";
import resultsPath, { RESULTS_PAGE } from "./resultsPath";

/**
 * Shows its page only to a reader who has opted into experimental features.
 * Anyone else lands on the scoreboard. `closed` sends the opted-in reader there
 * too, for a page with nothing to show that week.
 */
export default function ExperimentalGate({
  closed = false,
  children,
}: PropsWithChildren<{ closed?: boolean }>) {
  const { season, week } = useParams();
  const { experimentalFeatures } = useSettings();
  if (!experimentalFeatures || closed) {
    return (
      <Navigate
        replace
        to={resultsPath(season, week, RESULTS_PAGE.scoreboard)}
      />
    );
  }
  return children;
}
