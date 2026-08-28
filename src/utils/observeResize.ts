/**
 * Watches every element given for a change of size, and hands back what undoes it.
 *
 * A runtime without `ResizeObserver`, jsdom among them, gets a disposer that does
 * nothing rather than a throw on the way in, so a caller measuring the page can be
 * mounted anywhere. Nullish targets are skipped, which is what a ref not yet
 * attached reads as, and a call with nothing to watch builds no observer at all.
 *
 * One observer over all of them: the callback is handed the entries, so a caller
 * watching two boxes still hears about either.
 */
export default function observeResize(
  targets: Array<Element | null | undefined>,
  onResize: (entries: Array<ResizeObserverEntry>) => void,
): () => void {
  const watched = targets.filter((target) => target != null);
  if (typeof ResizeObserver === "undefined" || watched.length === 0) {
    return () => {};
  }
  const observer = new ResizeObserver(onResize);
  watched.forEach((target) => observer.observe(target));
  return () => observer.disconnect();
}
