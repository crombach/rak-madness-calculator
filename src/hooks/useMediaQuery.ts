import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Whether the browser answers yes to a media query, kept in step as it changes.
 *
 * jsdom lays nothing out and answers no to every query, which is what puts a test
 * on the widest screen. `setupTests.ts` says so where it stubs `matchMedia`.
 */
export default function useMediaQuery(query: string): boolean {
  const list = useMemo(() => window.matchMedia(query), [query]);
  const subscribe = useCallback(
    (onChange: () => void) => {
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [list],
  );
  return useSyncExternalStore(subscribe, () => list.matches);
}
