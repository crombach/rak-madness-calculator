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
 * The lines either side of the scores, each of which is one word on one line.
 *
 * A word is set on the line whether or not the line is wide enough to hold it, so a
 * name with too little room runs on over the mark beside it rather than wrapping under
 * it. That is what makes a line wider than the box it was given, which is the one
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
 * The one cut a scoreline makes to fit: the full names go, down to the abbreviation
 * ESPN says the game in. The marks stand over the names rather than beside them, so a
 * side is only as wide as the wider of the two, and they never have to go.
 */
export const SHORT_NAMES = 1;

/**
 * How much of the scoreline there is room for, measured rather than read off a width.
 *
 * What a side needs is what it is called, and no width tells `CONN` and `BUF` apart.
 * The same phone holds one game's scoreline and breaks the next one's. So the whole
 * thing goes in, the scoreline is measured, and it is cut back if a name is running over
 * the room it was given.
 *
 * The verdict is held against the game it was reached on and the width it was reached
 * at, rather than as a flag. Either one moving puts the whole scoreline back and asks
 * again. Another game is another pair of names, and another width is other room to hold
 * them.
 *
 * @param id the game on screen, which is what the verdict is about.
 */
export default function useScorelineFit(
  id: string,
): [RefObject<HTMLDivElement | null>, number] {
  const scoreline = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>();
  const [cut, setCut] = useState<{
    id: string;
    width?: number;
    step: number;
  }>();

  const step =
    cut != null && cut.id === id && cut.width === width ? cut.step : 0;

  const measure = useCallback(() => {
    const element = scoreline.current;
    if (element == null || step >= SHORT_NAMES) {
      return;
    }
    if (isCramped(element)) {
      setCut({ id, width, step: step + 1 });
    }
  }, [id, step, width]);

  // Every render, since what the scoreline holds decides this, and going final rewrites
  // half of it. Runs before paint, so a dropped step was never seen holding it.
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

  return [scoreline, step];
}
