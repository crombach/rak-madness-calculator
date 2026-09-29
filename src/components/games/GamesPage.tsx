import lazyPreloadable from "../../utils/lazyPreloadable";
import GamesSkeleton from "./GamesSkeleton";

// Lazy for the scoreline, which `ResultsFrame` keeps out of the chunk every route
// waits on. `preload` is what it fetches ahead of the menu's link.
export const { Page: GamesPage, preload: preloadGamesRoute } = lazyPreloadable(
  () => import("./GamesRoute"),
  <GamesSkeleton />,
);
