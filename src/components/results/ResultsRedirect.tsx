import { Navigate, useParams } from "react-router";
import SKELETONS from "./resultsSkeletons";
import resultsPath, { ResultsPage } from "./resultsPath";

/**
 * Sends a page that has nothing to show to another page of the same week.
 *
 * Draws the destination's wireframe while it goes. The frame is cut to its
 * content at wide widths, so a bare redirect would collapse it for a frame.
 */
export default function ResultsRedirect({ to }: { to: ResultsPage }) {
  const { season, week } = useParams();
  return (
    <>
      <Navigate replace to={resultsPath(season, week, to)} />
      {SKELETONS[to]}
    </>
  );
}
