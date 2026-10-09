import { PropsWithChildren, ReactNode, useLayoutEffect, useRef } from "react";
import usePullToRefresh, { Pull } from "../../hooks/usePullToRefresh";
import getClasses from "../../utils/getClasses";
import { ScreenRotationIcon } from "../icon/Icon";
import Navbar from "../navbar/Navbar";
import PullIndicator from "./PullIndicator";
import "./PageLayout.scss";

/**
 * The box every page stands in: the navbar, then the page, then the note a
 * sideways phone gets. Rendered once for the whole app, so the navbar stays
 * mounted from one page to the next.
 */
export function PageFrame({
  navbarLeft,
  navbarRight,
  children,
}: PropsWithChildren<{ navbarLeft: ReactNode; navbarRight?: ReactNode }>) {
  return (
    <div className="page">
      <a className="page__skip-link" href="#main">
        Skip to results
      </a>
      <Navbar left={navbarLeft} right={navbarRight} />
      {children}
      {/*
        Drawn only on a sideways phone, covering the page. Otherwise
        `display: none`, out of the accessibility tree, not just off screen.
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

/** One page's main area, under the navbar `PageFrame` draws. */
export default function PageLayout({
  title,
  showingResults = false,
  scrollable = true,
  pull,
  scrollKey,
  children,
}: PropsWithChildren<{
  /**
   * The page's one `<h1>`, drawn nowhere. Every route here is a logo, a bar of
   * controls, and a table, so there is no heading to show, and a page with no
   * `<h1>` gives a screen reader nothing to say about where it has landed.
   */
  title: string;
  showingResults?: boolean;
  /**
   * Set false to refuse the pointer, so what is on screen cannot be scrolled or
   * clicked. The content keeps whatever scrollbars it asks for either way.
   */
  scrollable?: boolean;
  /**
   * The refresh a pull on the content offers, which is a touch screen's replacement for
   * the refresh button. Left out by a page with nothing to refetch, and by one
   * with nothing on it to pull yet.
   */
  pull?: Pull;
  /**
   * Names the page on show. The content returns to the top when it changes, and
   * pages that share a key keep their offset.
   */
  scrollKey?: string;
}>) {
  const contentRef = useRef<HTMLElement>(null);
  const shownKey = useRef(scrollKey);
  useLayoutEffect(() => {
    if (shownKey.current === scrollKey) return;
    shownKey.current = scrollKey;
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [scrollKey]);
  const isPullArmed = usePullToRefresh({ scrollRef: contentRef, pull });

  return (
    <>
      {isPullArmed && <PullIndicator />}
      <main
        id="main"
        ref={contentRef}
        className={getClasses("page__content", {
          "--results": showingResults,
          "--frozen": !scrollable,
        })}
      >
        <h1 className="page__title">{title}</h1>
        {children}
      </main>
    </>
  );
}
