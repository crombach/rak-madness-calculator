const warmed = new Map<string, HTMLImageElement>();

export function warmedImageUrls(): Array<string> {
  return [...warmed.keys()];
}

/**
 * Fetches an image into the browser's own image cache, where an `<img>` drawn later
 * with the same `src` finds it already there rather than going back out for it.
 *
 * A `<link rel=prefetch>` is the cheaper-looking way to do this and does not hold
 * up. It is a hint the browser may defer or drop, and Safari does not implement it
 * at all. Neither way warns about an unused resource, which is what rules out
 * `rel=preload`.
 *
 * Each image is kept, because a collected one can take its cache entry with it.
 */
export default function warmImage(url: string) {
  if (warmed.has(url)) return;
  const image = new Image();
  image.src = url;
  warmed.set(url, image);
}
