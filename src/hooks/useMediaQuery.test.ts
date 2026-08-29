import { act, renderHook } from "@testing-library/react";
import useMediaQuery from "./useMediaQuery";

const QUERY = "(max-width: 480px)";

/** A `matchMedia` whose answer the test can change, which jsdom's stub cannot. */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const list = {
    matches,
    addEventListener: (_: string, listener: () => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_: string, listener: () => void) => {
      listeners.delete(listener);
    },
  };
  window.matchMedia = (() => list) as unknown as typeof window.matchMedia;
  return {
    listeners,
    answer(next: boolean) {
      list.matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

describe("useMediaQuery", () => {
  const realMatchMedia = window.matchMedia;
  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  it("reports the answer the browser gives now", () => {
    stubMatchMedia(true);

    expect(renderHook(() => useMediaQuery(QUERY)).result.current).toBe(true);
  });

  it("reports it again when the answer changes", () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery(QUERY));

    act(() => media.answer(true));

    expect(result.current).toBe(true);
  });

  it("stops listening once it is gone", () => {
    const media = stubMatchMedia(false);

    renderHook(() => useMediaQuery(QUERY)).unmount();

    expect(media.listeners.size).toBe(0);
  });
});
