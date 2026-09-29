type LiveGamesRouteModule = typeof import("./LiveGamesRoute");

let loaded: LiveGamesRouteModule | undefined;

/** The page's own chunk, which `ResultsFrame` fetches ahead of the menu's link. */
export default function loadLiveGamesRoute(): Promise<LiveGamesRouteModule> {
  return import("./LiveGamesRoute").then((module) => (loaded = module));
}

/**
 * The page once its chunk is in. `lazy` suspends for a tick even on a chunk that
 * is already in, and React then holds its fallback up for 300ms.
 */
export function loadedLiveGamesRoute() {
  return loaded?.default;
}
