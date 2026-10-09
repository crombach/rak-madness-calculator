import { PropsWithChildren } from "react";
import { useSetting } from "../../context/SettingsContext";
import ResultsRedirect from "./ResultsRedirect";
import { RESULTS_PAGE } from "./resultsPath";

/**
 * Shows its page only to a reader who has opted into experimental features.
 * Anyone else lands on the scoreboard.
 */
export default function ExperimentalGate({ children }: PropsWithChildren) {
  const experimentalFeatures = useSetting("experimentalFeatures");
  if (!experimentalFeatures) {
    return <ResultsRedirect to={RESULTS_PAGE.scoreboard} />;
  }
  return children;
}
