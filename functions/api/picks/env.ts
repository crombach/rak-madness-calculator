export type Env = {
  RAK_MADNESS_BUCKET: R2Bucket;
};

export function serviceUnavailable(message: string, error: unknown): Response {
  console.error(message, error);
  return new Response("Service Unavailable", { status: 503 });
}

/**
 * What `cachedGet` needs from a route's context, rather than the whole
 * `EventContext`, whose generics differ between a route with path params and one
 * without.
 */
type CacheableContext = {
  request: Request;
  waitUntil: (promise: Promise<unknown>) => void;
};

/**
 * `build`'s answer, served from the colo's cache when it is already there.
 *
 * Both routes send a `Cache-Control` that says how long their answer stands, and
 * neither was reaching a cache: Cloudflare will not cache a Function's JSON or
 * xlsx without being asked, so every request ran an R2 round trip and measured
 * 430-540ms of TTFB. The Cache API is the asking. It honors the same
 * `Cache-Control` already on the response, so the TTL stays where the route
 * declares it.
 *
 * Per-colo and not tiered, so this earns nothing for the first reader to want a
 * week in their region and everything for the next one.
 *
 * Only a 200 is stored. A 304 belongs to the caller that asked for it, and a 404
 * or a 503 carries no `Cache-Control` to bound how long a wrong answer would
 * stand. A stored 200 still answers a later `If-None-Match` with a 304, because
 * `match` reads the `ETag` it was stored with.
 */
export async function cachedGet(
  context: CacheableContext,
  build: () => Promise<Response>,
): Promise<Response> {
  const cache = caches.default;
  const cached = await cache.match(context.request);
  if (cached != null) {
    return cached;
  }

  const response = await build();
  if (response.status === 200) {
    // Cloned rather than read here, so the caller gets the body as it arrives
    // instead of waiting on the copy the cache keeps.
    context.waitUntil(cache.put(context.request, response.clone()));
  }
  return response;
}
