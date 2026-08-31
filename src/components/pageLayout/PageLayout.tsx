import { PropsWithChildren, ReactNode, useRef } from "react";
import usePullToRefresh, { Pull } from "../../hooks/usePullToRefresh";
import getClasses from "../../utils/getClasses";
import { ScreenRotationIcon } from "../icon/Icon";
import Navbar from "../navbar/Navbar";
import PullIndicator from "./PullIndicator";
import "./PageLayout.scss";

/** The chrome every page shares: the navbar and the main area. */
export default function PageLayout({
  title,
  navbarLeft,
  navbarRight,
  showingResults = false,
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
  showingResults?: boolean;
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
  const contentRef = useRef<HTMLElement>(null);
  const isPullArmed = usePullToRefresh({ scrollRef: contentRef, pull });

  return (
    <div className="page">
      <a className="page__skip-link" href="#main">
        Skip to results
      </a>
      <Navbar left={navbarLeft} right={navbarRight} />
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
