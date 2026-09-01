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
 *
 * So a colo whose copy has expired refills only when a reader who holds no `ETag`
 * arrives. Everyone else revalidates, gets a 304 built from R2's metadata, and
 * stores nothing. Storing on a 304 would mean reading the whole workbook from R2
 * on the requests that currently read none of it, which costs more than the colo
 * copy is worth at a minute of edge TTL. Left as it is on purpose.
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
    //
    // `put` rejects on a response it will not store, a 413 among them. The caller
    // already has its answer, so the invocation is not failed over a cache write
    // that did not land.
    context.waitUntil(
      cache.put(context.request, response.clone()).catch((error) => {
        console.error("Failed to cache picks response", error);
      }),
    );
  }
  return response;
}
