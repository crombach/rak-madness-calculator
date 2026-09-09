import { useEffect } from "react";

/** The height actually on screen, which `dvh` does not shrink to. */
export const VIEWPORT_HEIGHT_VAR = "--rak-viewport-height";

/** How far down the layout viewport the visible area starts. */
export const VIEWPORT_OFFSET_VAR = "--rak-viewport-offset";

/** How much of the bottom edge something like a keyboard covers. */
export const KEYBOARD_INSET_VAR = "--rak-keyboard-inset";

export type ViewportInsets = {
  height: number;
  offset: number;
  keyboardInset: number;
};

/**
 * The shortest a bottom inset can be and still be a keyboard.
 *
 * Where `interactive-widget=resizes-content` is honored the keyboard comes out of the
 * layout viewport as well, so both heights shrink and the difference settles at zero.
 * They do not shrink in the same frame, and mid-animation the subtraction reports a
 * keyboard that is not there, which pads the sheet against nothing for a frame and
 * reads as a stutter. Every keyboard worth answering is far taller than this.
 */
const KEYBOARD_FLOOR = 80;

/**
 * What is on screen, out of what the layout is sized against.
 *
 * A virtual keyboard shrinks the visual viewport, and where the layout viewport is
 * left alone `dvh` still measures the whole screen and anything sized in it runs on
 * under the keyboard. This is the difference, for the stylesheet to subtract.
 *
 * Pinching zooms the visual viewport the same way a keyboard shrinks it, and a
 * reader who zoomed in did not ask for the dialog to be resized around them, so
 * a zoomed page reports the layout viewport back unchanged.
 */
export function viewportInsets({
  layoutHeight,
  viewportHeight,
  offsetTop,
  scale,
}: {
  layoutHeight: number;
  viewportHeight: number;
  offsetTop: number;
  scale: number;
}): ViewportInsets {
  if (scale > 1) {
    return { height: layoutHeight, offset: 0, keyboardInset: 0 };
  }
  const bottom = layoutHeight - viewportHeight - offsetTop;
  return {
    height: viewportHeight,
    offset: offsetTop,
    keyboardInset: bottom >= KEYBOARD_FLOOR ? bottom : 0,
  };
}

/**
 * Whether two measurements are the same, which is how the loop below stops and
 * what keeps it from writing the same numbers back every frame.
 */
export function sameInsets(
  a: ViewportInsets | undefined,
  b: ViewportInsets,
): boolean {
  return (
    a != null &&
    a.height === b.height &&
    a.offset === b.offset &&
    a.keyboardInset === b.keyboardInset
  );
}

/** How long the same measurement has to hold for the keyboard to be done moving. */
const SETTLED_FRAMES = 5;

/** The longest the loop runs, in case something keeps the viewport moving. */
const TRACKING_MS = 1000;

/**
 * Publishes the visible viewport to the document root, so a stylesheet can size
 * against what the reader can actually see rather than the whole screen.
 *
 * Held to while `enabled`, since the only thing that asks is a dialog with a
 * search in it, and the properties are dropped on the way out so everything
 * falls back to its `dvh` default.
 *
 * A keyboard opens over a few hundred milliseconds, and Safari reports that with
 * far fewer events than there are frames in it, so listening alone leaves the
 * sheet sitting behind the keyboard and then jumping clear. Anything that could
 * be the start of one instead kicks off a frame by frame read of the viewport,
 * which stops once the numbers hold still. The properties are written straight
 * to the root rather than through React, so a frame's measurement paints in that
 * frame.
 */
export default function useViewportInsets(enabled: boolean): void {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!enabled || viewport == null) return;

    const root = document.documentElement;
    let last: ViewportInsets | undefined;
    let frame = 0;

    // Answers whether the viewport held still, what the loop counts. The root is
    // written only when it moved, so frames beside a keyboard cost just a read.
    const measure = (): boolean => {
      const insets = viewportInsets({
        layoutHeight: window.innerHeight,
        viewportHeight: viewport.height,
        offsetTop: viewport.offsetTop,
        scale: viewport.scale,
      });
      const held = sameInsets(last, insets);
      last = insets;
      if (!held) {
        root.style.setProperty(VIEWPORT_HEIGHT_VAR, `${insets.height}px`);
        root.style.setProperty(VIEWPORT_OFFSET_VAR, `${insets.offset}px`);
        root.style.setProperty(KEYBOARD_INSET_VAR, `${insets.keyboardInset}px`);
      }
      return held;
    };

    // Restarted rather than stacked, so a second event partway through a keyboard
    // opening extends the read instead of running a loop of its own.
    const track = () => {
      cancelAnimationFrame(frame);
      let held = 0;
      const until = performance.now() + TRACKING_MS;
      const step = () => {
        held = measure() ? held + 1 : 0;
        if (held < SETTLED_FRAMES && performance.now() < until) {
          frame = requestAnimationFrame(step);
        }
      };
      step();
    };

    track();
    viewport.addEventListener("resize", track);
    viewport.addEventListener("scroll", track);
    // The first sign a keyboard is on its way, and earlier than any of the above.
    window.addEventListener("focusin", track);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", track);
      viewport.removeEventListener("scroll", track);
      window.removeEventListener("focusin", track);
      root.style.removeProperty(VIEWPORT_HEIGHT_VAR);
      root.style.removeProperty(VIEWPORT_OFFSET_VAR);
      root.style.removeProperty(KEYBOARD_INSET_VAR);
    };
  }, [enabled]);
}
