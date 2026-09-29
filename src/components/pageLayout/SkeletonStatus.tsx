import { ResultsPage } from "../results/resultsPath";
import "./SkeletonStatus.scss";

/**
 * What a screen reader hears in place of a wireframe, which is hidden from it
 * entirely. Stands beside the wireframe, never inside it.
 */
export default function SkeletonStatus({ page }: { page: ResultsPage }) {
  return (
    <span className="skeleton__status" role="status">
      Loading {page.toLowerCase()} results
    </span>
  );
}
