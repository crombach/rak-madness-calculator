/** When a missing chunk last reloaded the page, so a chunk gone for good cannot loop. */
const RELOADED_AT_KEY = "rak-madness:chunkReloadedAt";
const RELOAD_COOLDOWN_MS = 10_000;

/**
 * Reloads the page for a chunk a deploy removed since this tab loaded. Every deploy
 * renames its chunks, and an open tab still asks for the old names. Never settles
 * once it reloads, so the loading fallback stays up until the page goes.
 *
 * Rejects with `error` when it reloaded moments ago, since the new build lacks the
 * chunk too, and when session storage is out of reach to say so.
 */
export default function reloadForNewBuild(error: unknown): Promise<never> {
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
