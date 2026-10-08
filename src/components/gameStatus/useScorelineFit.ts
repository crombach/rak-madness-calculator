import {
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import observeResize from "../../utils/observeResize";

/**
 * The lines under each side's mark. A name wraps between its words and never inside
 * one, so a word too long for the column runs past the line's box. That is the one
 * question asked of these.
 */
const SIDE_LINES = ".game-status__team-name, .game-status__record";

/** Whether anything either side of the scores is wider than the room it was given. */
function isCramped(scoreline: HTMLElement): boolean {
  return Array.from(scoreline.querySelectorAll<HTMLElement>(SIDE_LINES)).some(
    (line) => line.scrollWidth > line.clientWidth,
  );
}

/**
 * Whether the scoreline names its sides by abbreviation, measured rather than read off
 * a width. The marks stand over the names rather than beside them, so they never have
 * to go.
 *
 * What a side needs is what it is called, and no width tells `CONN` and `BUF` apart.
 * The same phone holds one game's scoreline and breaks the next one's. So the full
 * names go in, the scoreline is measured, and the names are shortened if one runs over
 * the room it was given.
 *
 * The verdict is held against the game it was reached on and the width it was reached
 * at, rather than as a flag. Either one moving puts the full names back and asks again.
 * Another game is another pair of names, and another width is other room to hold them.
 *
 * @param id the game on screen, which is what the verdict is about.
 */
export default function useScorelineFit(
  id: string,
): [RefObject<HTMLDivElement | null>, boolean] {
  const scoreline = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>();
  const [shortened, setShortened] = useState<{ id: string; width?: number }>();

  const shortNames =
    shortened != null && shortened.id === id && shortened.width === width;

  const measure = useCallback(() => {
    const element = scoreline.current;
    if (element == null || shortNames) {
      return;
    }
    if (isCramped(element)) {
      setShortened({ id, width });
    }
  }, [id, shortNames, width]);

  // Every render, since what the scoreline holds decides this, and going final rewrites
  // half of it. Runs before paint, so a name too long for its column is never seen.
  useLayoutEffect(measure);

  // A name measured in the fallback font was measured at the wrong width, and the swap
  // to Inter is not a thing the page is rendered again for. Asked once more when the
  // font is in, which on a warm cache is straight away. Guarded because jsdom, which
  // has no layout to measure in the first place, has no font set either.
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => {
      if (live) {
        measure();
      }
    });
    return () => {
      live = false;
    };
  }, [measure]);

  // The width alone. Every cut makes the scoreline shorter, and a height this answered
  // would put the question again on the strength of its own answer, forever.
  useEffect(
    () =>
      observeResize([scoreline.current], ([entry]) =>
        setWidth(entry.contentRect.width),
      ),
    [],
  );

  return [scoreline, shortNames];
}
