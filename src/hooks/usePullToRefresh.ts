import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import useMediaQuery from "./useMediaQuery";

/** How far the content has moved, for the stylesheet to translate the box by. */
export const PULL_OFFSET_VAR = "--rak-pull-offset";

/** How far along the pull is, out of one, which is what fades the puck in. */
export const PULL_PROGRESS_VAR = "--rak-pull-progress";

/** Where the pull has got to. Absent when there is no pull to draw. */
export const PULL_PHASE_ATTR = "data-pull";

/** How far a finger moves before it has said which way it is going. */
export const PULL_SLOP_PX = 8;

/** How far the content moves before letting go refreshes rather than springs back. */
export const PULL_TRIGGER_PX = 72;

/** The furthest the content moves, however far the finger goes. */
export const PULL_MAX_PX = 112;

/**
 * How long the spring back takes. Matches `--rak-duration-slow`, which the
 * stylesheet times the transition to, so the transform is dropped in the frame it
 * reaches zero rather than before.
 */
export const PULL_SETTLE_MS = 300;

/**
 * The least time the puck stays open once the finger is off it.
 *
 * A rescore off a warm cache finishes inside a frame, and a call the throttle
 * drops never starts at all. Without a floor both read as the gesture having
 * failed. Under the 500ms throttle window, so a second pull cannot arrive before
 * the first has visibly finished.
 */
export const PULL_MIN_HOLD_MS = 400;

export type PullAxis = "undecided" | "pull" | "abandoned";

/**
 * Which way a drag went, from how far it has come.
 *
 * Biased against the pull on purpose. A picks table is wider than the phone, so
 * panning it sideways is the common motion, and a diagonal drag belongs to that
 * rather than to a refresh.
 */
export function lockAxis(dx: number, dy: number): PullAxis {
  if (Math.abs(dx) < PULL_SLOP_PX && Math.abs(dy) < PULL_SLOP_PX) {
    return "undecided";
  }
  return dy > 0 && dy > Math.abs(dx) * 1.5 ? "pull" : "abandoned";
}

/**
 * How far the content travels for a finger this far down the screen.
 *
 * One to one up to the trigger, so up to the point it matters the content is
 * under the finger rather than lagging it. Past that it resists, and approaches
 * `PULL_MAX_PX` without reaching it: a hard stop reads as the gesture having
 * broken, where getting heavier reads as the end of it.
 */
export function pullOffset(distance: number): number {
  if (distance <= 0) return 0;
  if (distance <= PULL_TRIGGER_PX) return distance;
  const slack = PULL_MAX_PX - PULL_TRIGGER_PX;
  const past = distance - PULL_TRIGGER_PX;
  return PULL_TRIGGER_PX + (slack * past) / (past + slack);
}

/** The refresh a pull offers, or nothing where a pull refreshes nothing. */
export type Pull = { onRefresh: () => void; isRefreshing: boolean };

/** The query `phone-touch` guards, which `index.scss` exports for this to read. */
function phoneTouchQuery(): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--rak-phone-touch")
    .trim()
    .replace(/^"|"$/g, "");
}

/**
 * Pull down from the top of the scrolling box to refresh what is in it.
 *
 * A phone's replacement for the refresh button, which `phone-touch` takes off the
 * bar at the same width. Not the browser's own pull-to-refresh, which `index.scss`
 * turns off: that reloads the document, and the scores are rescored from a
 * workbook held in memory, which a reload would throw away.
 *
 * Writes where the pull has got to onto the root element rather than into state,
 * the way `useViewportInsets` does, so a finger moving over a table of a thousand
 * cells does not re-render one of them. What comes back is whether the gesture is
 * attached at all, which is what says to draw the puck.
 */
export default function usePullToRefresh({
  scrollRef,
  pull,
}: {
  /** The box that scrolls, which the listeners go on. */
  scrollRef: RefObject<HTMLElement | null>;
  /** Left out by a page with nothing to refetch, which disarms the gesture. */
  pull?: Pull;
}): boolean {
  const [query] = useState(phoneTouchQuery);
  const isPhone = useMediaQuery(query);
  const isArmed = isPhone && pull != null;

  // Held open from the finger coming off until the refresh has been seen to run.
  const [isHolding, setHolding] = useState(false);
  // The gesture's own bookkeeping, which no render reads.
  const drag = useRef({ x: 0, y: 0, offset: 0, axis: "abandoned" as PullAxis });
  const releasedAt = useRef(0);
  const clearTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Read by listeners attached once, which outlive the render that made them.
  const onRefresh = useRef(pull?.onRefresh);
  useEffect(() => {
    onRefresh.current = pull?.onRefresh;
  });

  const write = useCallback((offset: number, phase: string) => {
    const root = document.documentElement;
    drag.current.offset = offset;
    root.style.setProperty(PULL_OFFSET_VAR, `${offset}px`);
    root.style.setProperty(
      PULL_PROGRESS_VAR,
      `${Math.min(offset / PULL_TRIGGER_PX, 1)}`,
    );
    root.setAttribute(PULL_PHASE_ATTR, phase);
  }, []);

  const clear = useCallback(() => {
    const root = document.documentElement;
    drag.current.offset = 0;
    root.style.removeProperty(PULL_OFFSET_VAR);
    root.style.removeProperty(PULL_PROGRESS_VAR);
    root.removeAttribute(PULL_PHASE_ATTR);
  }, []);

  /**
   * Back to nothing, over the length of the transition the stylesheet runs on
   * both closing phases, and the transform is given up in the frame it reaches
   * zero.
   *
   * The two are told apart because only one of them was working. `closing`
   * carries the sheen the whole way home rather than cutting it at the first
   * frame of the retreat, and `settling` is the pull that stopped short, which
   * has nothing to say it was doing anything.
   */
  const settle = useCallback(
    (phase: "settling" | "closing") => {
      write(0, phase);
      clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(clear, PULL_SETTLE_MS);
    },
    [write, clear],
  );

  useEffect(() => {
    const box = scrollRef.current;
    if (!isArmed || box == null) return;

    const start = (event: TouchEvent) => {
      // A second finger, or a box already scrolled down. Abandoned for the whole
      // of that touch, so its momentum and this gesture are never both running.
      if (event.touches.length !== 1 || box.scrollTop > 0) {
        drag.current.axis = "abandoned";
        return;
      }
      const touch = event.touches[0];
      drag.current = {
        x: touch.clientX,
        y: touch.clientY,
        offset: 0,
        axis: "undecided",
      };
    };

    const move = (event: TouchEvent) => {
      const { axis, x, y } = drag.current;
      if (axis === "abandoned") return;
      const touch = event.touches[0];
      if (touch == null) return;
      const dx = touch.clientX - x;
      const dy = touch.clientY - y;
      if (axis === "undecided") {
        const decided = lockAxis(dx, dy);
        if (decided === "undecided") return;
        drag.current.axis = decided;
        if (decided === "abandoned") return;
      }
      // Only once the pull has won, so the moves that turn out to be a sideways
      // pan still scroll. This works at all because the listener below is the
      // non-passive one: React's own are passive, and there this does nothing.
      event.preventDefault();
      const offset = pullOffset(dy);
      write(offset, offset >= PULL_TRIGGER_PX ? "armed" : "pulling");
    };

    const end = () => {
      const { axis, offset } = drag.current;
      drag.current.axis = "abandoned";
      if (axis !== "pull") return;
      if (offset < PULL_TRIGGER_PX) {
        settle("settling");
        return;
      }
      // Pinned where the puck rests while the week is rescored.
      write(PULL_TRIGGER_PX, "refreshing");
      releasedAt.current = performance.now();
      setHolding(true);
      onRefresh.current?.();
    };

    box.addEventListener("touchstart", start, { passive: true });
    box.addEventListener("touchmove", move, { passive: false });
    box.addEventListener("touchend", end, { passive: true });
    box.addEventListener("touchcancel", end, { passive: true });
    return () => {
      box.removeEventListener("touchstart", start);
      box.removeEventListener("touchmove", move);
      box.removeEventListener("touchend", end);
      box.removeEventListener("touchcancel", end);
      // Nothing left to pull on, so whatever is open goes with it.
      clearTimeout(clearTimer.current);
      clear();
    };
  }, [isArmed, scrollRef, write, settle, clear]);

  // What holds the puck open, and what closes it. `isRefreshing` rather than the
  // promise `onRefresh` returns, which resolves at once when the throttle drops
  // the call and would close the puck on a refresh that never ran.
  const isRefreshing = pull?.isRefreshing ?? false;
  useEffect(() => {
    if (!isArmed || !isHolding || isRefreshing) return;
    const left = PULL_MIN_HOLD_MS - (performance.now() - releasedAt.current);
    const timer = setTimeout(
      () => {
        settle("closing");
        setHolding(false);
      },
      Math.max(left, 0),
    );
    return () => clearTimeout(timer);
  }, [isArmed, isHolding, isRefreshing, settle]);

  useEffect(() => () => clearTimeout(clearTimer.current), []);

  return isArmed;
}
