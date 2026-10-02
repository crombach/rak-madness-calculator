import lazyPreloadable from "../../utils/lazyPreloadable";
import KnockoutsSkeleton from "./KnockoutsSkeleton";

// Lazy for the must-win search it reaches, which `ResultsFrame` keeps out of the
// chunk every route waits on.
export const knockoutsPage = lazyPreloadable(
  () => import("./KnockoutsRoute"),
  <KnockoutsSkeleton />,
);
