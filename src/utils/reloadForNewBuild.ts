/** When a missing chunk last reloaded the page, so a chunk gone for good cannot loop. */
const RELOADED_AT_KEY = "rak-madness:chunkReloadedAt";
const RELOAD_COOLDOWN_MS = 10_000;
/**
 * A chunk that failed to fetch, in Chrome's, Firefox's and Safari's words, and in
 * Vite's for the stylesheet it loads ahead of a route's code.
 */
const LOST_CHUNK =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/;

/**
 * Reloads the page for a chunk that failed to fetch, which is a deploy having removed
 * it since this tab loaded. Never settles once it reloads, so the loading fallback
 * stays up until the page goes.
 *
 * Rejects with `error` instead when the tab is offline, when `error` is anything but
 * a failed fetch, when it reloaded under 10 seconds ago, and when session storage
 * throws.
 */
export default function reloadForNewBuild(error: unknown): Promise<never> {
  if (
    !navigator.onLine ||
    !(error instanceof Error) ||
    !LOST_CHUNK.test(error.message)
  ) {
    return Promise.reject(error);
  }
  const now = Date.now();
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT_KEY));
    if (now - last < RELOAD_COOLDOWN_MS) return Promise.reject(error);
    sessionStorage.setItem(RELOADED_AT_KEY, String(now));
  } catch {
    return Promise.reject(error);
  }
  window.location.reload();
  return new Promise(() => {});
}
