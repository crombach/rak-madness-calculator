import lazyPreloadable from "../../utils/lazyPreloadable";
import ComparePlayersSkeleton from "./ComparePlayersSkeleton";

// Lazy for Base UI's combobox, which `ResultsFrame` keeps out of the chunk every
// route waits on.
export const comparePlayersPage = lazyPreloadable(
  () => import("./ComparePlayersRoute"),
  <ComparePlayersSkeleton />,
);
