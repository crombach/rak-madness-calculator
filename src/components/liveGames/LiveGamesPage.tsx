import { Suspense, lazy } from "react";
import LiveGamesSkeleton from "./LiveGamesSkeleton";
import loadLiveGamesRoute, { loadedLiveGamesRoute } from "./loadLiveGamesRoute";

// Lazy for the scoreline, which `ResultsFrame` keeps out of the chunk every route
// waits on.
const LazyLiveGamesRoute = lazy(loadLiveGamesRoute);

/** The route straight away once its chunk is in, else the wireframe until it is. */
export default function LiveGamesPage() {
  const LiveGamesRoute = loadedLiveGamesRoute();
  // The chunk's own export, so the same component on every render.
  // eslint-disable-next-line react-hooks/static-components
  if (LiveGamesRoute != null) return <LiveGamesRoute />;
  return (
    <Suspense fallback={<LiveGamesSkeleton />}>
      <LazyLiveGamesRoute />
    </Suspense>
  );
}
