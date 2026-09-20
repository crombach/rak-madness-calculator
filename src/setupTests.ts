import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/dom";
import { vi } from "vitest";

// The app suites mount the whole app and wait on several chained promises, which
// takes longer than the 1s default on a loaded CI runner. Raised here rather than
// per call site, because any of them can be the one that runs slowly.
configure({ asyncUtilTimeout: 5000 });

// jsdom lays nothing out, so it ships no ResizeObserver. The dialog that grows to
// its content asks for one, and a stub that never reports leaves it at the height
// the stylesheet gives it.
globalThis.ResizeObserver = class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};

// jsdom lays nothing out, so it evaluates no media query either and ships no
// `matchMedia` at all. Answering no to every one of them puts a test on the widest
// screen, which is what jsdom's own viewport reports, and matches what the
// stylesheet cannot say here: none of its breakpoints apply under a test run.
window.matchMedia = (media: string): MediaQueryList =>
  ({
    media,
    matches: false,
    onchange: null,
    addEventListener: (): void => {},
    removeEventListener: (): void => {},
    addListener: (): void => {},
    removeListener: (): void => {},
    dispatchEvent: (): boolean => false,
  }) as MediaQueryList;

// @testing-library/dom decides whether fake timers are installed by looking for
// a `jest` global, then advances the clock through it. Without this shim its
// waiting helpers schedule work on the faked clock and never resolve, so every
// interaction in a suite using vi.useFakeTimers times out. The inner check is
// on setTimeout itself, so this stays inert under real timers.
(globalThis as Record<string, unknown>).jest = {
  advanceTimersByTime: (ms: number): void => {
    vi.advanceTimersByTime(ms);
  },
};
