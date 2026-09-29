import { Suspense, lazy } from "react";
import GamesSkeleton from "./GamesSkeleton";
import loadGamesRoute, { loadedGamesRoute } from "./loadGamesRoute";

// Lazy for the scoreline, which `ResultsFrame` keeps out of the chunk every route
// waits on.
const LazyGamesRoute = lazy(loadGamesRoute);

/** The route straight away once its chunk is in, else the wireframe until it is. */
export default function GamesPage() {
  const GamesRoute = loadedGamesRoute();
  // The chunk's own export, so the same component on every render.
  // eslint-disable-next-line react-hooks/static-components
  if (GamesRoute != null) return <GamesRoute />;
  return (
    <Suspense fallback={<GamesSkeleton />}>
      <LazyGamesRoute />
    </Suspense>
  );
}
