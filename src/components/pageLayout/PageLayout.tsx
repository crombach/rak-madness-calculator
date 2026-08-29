import {
  CSSProperties,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import usePullToRefresh, { Pull } from "../../hooks/usePullToRefresh";
import getClasses from "../../utils/getClasses";
import { ScreenRotationIcon } from "../icon/Icon";
import Navbar from "../navbar/Navbar";
import PullIndicator from "./PullIndicator";
import "./PageLayout.scss";

const BACKGROUND_TILE = "/logo512.png";

// Read by `PageLayout.scss`, so the file that loads the tile is also the one that
// names it. The color behind the tiles is a token there, not here: it is the
// largest surface in the app and does not belong in a style object.
const BACKGROUND_STYLE = {
  "--rak-background-tile": `url(${BACKGROUND_TILE})`,
} as CSSProperties;

/**
 * Sources that have finished loading once. Every route renders its own layout, so
 * without this the fade would start over on each move between pages.
 */
const loadedSources = new Set<string>();

/**
 * The width the stylesheet stops drawing the tiles at, asked as a query. Read from
 * the token `index.scss` exports rather than written again here, so the fetch and
 * the paint cannot disagree about where a phone ends.
 *
 * Negated rather than turned into a `max-width`, which would take in the breakpoint
 * itself: the stylesheet's own query is `min-width`, and this has to be exactly the
 * width it does not cover.
 */
function tilesDrawnQuery(): string {
  const width = getComputedStyle(document.documentElement)
    .getPropertyValue("--rak-breakpoint-roomy")
    .trim();
  return `not all and (min-width: ${width})`;
}

/**
 * Whether the browser holds the tile, so a background drawn from it can be faded in
 * rather than appear all at once. True from the first render once the image has been
 * through here before, which is what keeps the fade to the first page.
 *
 * Asked for only where the stylesheet draws it. Above that width the tiles are
 * `display: none`, so the browser never fetches them for the page itself and this
 * was the only thing pulling them down. Watched rather than read once, because a
 * window dragged narrow crosses the same line without a reload.
 */
function useTileLoaded(source: string): boolean {
  const [isLoaded, setIsLoaded] = useState(() => loadedSources.has(source));

  useEffect(() => {
    if (loadedSources.has(source)) return;
    const drawn = window.matchMedia(tilesDrawnQuery());
    let image: HTMLImageElement | undefined;
    const fetchOnce = () => {
      if (image || !drawn.matches) return;
      image = new Image();
      // Listen before asking, because an image already in the cache still fires
      // `load`, and it can fire as soon as the source is set.
      image.onload = () => {
        loadedSources.add(source);
        setIsLoaded(true);
      };
      image.src = source;
    };
    fetchOnce();
    drawn.addEventListener("change", fetchOnce);
    return () => {
      drawn.removeEventListener("change", fetchOnce);
      if (image) image.onload = null;
    };
  }, [source]);

  return isLoaded;
}

/** The chrome every page shares: the background, the navbar, and the main area. */
export default function PageLayout({
  title,
  navbarLeft,
  navbarRight,
  showingScores = false,
  scrollable = true,
  pull,
  children,
}: PropsWithChildren<{
  /**
   * The page's one `<h1>`, drawn nowhere. Every route here is a logo, a bar of
   * controls, and a table, so there is no heading to show, and a page with no
   * `<h1>` gives a screen reader nothing to say about where it has landed.
   */
  title: string;
  navbarLeft: ReactNode;
  navbarRight?: ReactNode;
  showingScores?: boolean;
  /**
   * Set false to refuse the pointer, so what is on screen cannot be scrolled or
   * clicked. The content keeps whatever scrollbars it asks for either way.
   */
  scrollable?: boolean;
  /**
   * The refresh a pull on the content offers, which is a phone's replacement for
   * the refresh button. Left out by a page with nothing to refetch, and by one
   * with nothing on it to pull yet.
   */
  pull?: Pull;
}>) {
  const areTilesLoaded = useTileLoaded(BACKGROUND_TILE);
  const contentRef = useRef<HTMLElement>(null);
  const isPullArmed = usePullToRefresh({ scrollRef: contentRef, pull });

  return (
    <div
      className={getClasses("page", { "--tiles-loaded": areTilesLoaded })}
      style={BACKGROUND_STYLE}
    >
      <a className="page__skip-link" href="#main">
        Skip to results
      </a>
      <Navbar left={navbarLeft} right={navbarRight} />
      {isPullArmed && <PullIndicator />}
      <main
        id="main"
        ref={contentRef}
        className={getClasses("page__content", {
          "--scores": showingScores,
          "--frozen": !scrollable,
        })}
      >
        <h1 className="page__title">{title}</h1>
        {children}
      </main>
      {/*
        Drawn only on a phone turned on its side, where the stylesheet covers the
        page with it. `display: none` the rest of the time, so it is out of the
        accessibility tree rather than merely off screen.
      */}
      <div className="page__rotate">
        <span className="page__rotate-icon">
          <ScreenRotationIcon />
        </span>
        <p className="page__rotate-message">Turn your phone upright</p>
        <p className="page__rotate-detail">
          Rakulator does not support landscape on a phone.
        </p>
      </div>
    </div>
  );
}
