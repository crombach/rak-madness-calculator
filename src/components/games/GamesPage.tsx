import lazyPreloadable from "../../utils/lazyPreloadable";
import GamesSkeleton from "./GamesSkeleton";

// Lazy for the scoreline, which `ResultsFrame` keeps out of the chunk every route
// waits on. `ResultsFrame` fetches it ahead of the menu's link.
export const gamesPage = lazyPreloadable(
  () => import("./GamesRoute"),
  <GamesSkeleton />,
);
