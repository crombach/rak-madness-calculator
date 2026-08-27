import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { FactCheckIcon, LeaderboardIcon, UpdateIcon } from "../icon/Icon";
import Button from "../button/Button";
import "./ScoresNavbar.scss";

export type ScoresView = "Scoreboard" | "Picks";

/**
 * How long the refresh button takes to fade away. Held here because it has to
 * stay mounted for exactly that long. The stylesheet reads it back as
 * `--collapse-duration`, so the two cannot drift apart.
 */
export const COLLAPSE_DURATION_MS = 300;

function ViewButton({
  view,
  icon,
  label,
  currentView,
  noViewYet,
  disabled,
  onViewChange,
}: {
  view: ScoresView;
  icon: ReactNode;
  label: string;
  currentView: ScoresView | null;
  noViewYet: boolean;
  disabled: boolean;
  onViewChange: (view: ScoresView) => void;
}) {
  return (
    <Button
      disabled={noViewYet}
      ariaDisabled={disabled}
      compact
      selected={currentView === view}
      onClick={() => onViewChange(view)}
      className="scores-nav__button"
    >
      {icon}
      {/* Drawn only where the navbar has room, and read by a screen reader
          everywhere, so the button is never nameless. */}
      <span className="scores-nav__label">{label}</span>
    </Button>
  );
}

/** The scoreboard/picks switch, and the refresh a week still being played gets. */
export default function ScoresNavbar({
  view,
  onViewChange,
  onRefresh,
  isRefreshing,
  disabled = false,
  isWeekLive,
}: {
  /** `null` while no view is open yet, so neither button reads as selected. */
  view: ScoresView | null;
  onViewChange: (view: ScoresView) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  /** Set while a week is still loading, so the navbar keeps its shape. */
  disabled?: boolean;
  /** Cleared once the week is over, when rescoring cannot change anything. */
  isWeekLive: boolean;
}) {
  // A week arrives loading, so this is usually on screen by the time it turns out
  // to be decided. Kept mounted for the length of the collapse so it animates out,
  // and a week already known to be decided never renders it at all.
  const [isLiveMounted, setLiveMounted] = useState(isWeekLive);
  if (isWeekLive && !isLiveMounted) setLiveMounted(true);
  useEffect(() => {
    if (isWeekLive || !isLiveMounted) return;
    const timer = setTimeout(() => setLiveMounted(false), COLLAPSE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isWeekLive, isLiveMounted]);

  // A results route always names a view, even while it loads, so that button
  // keeps looking selected through the wait: only `aria-disabled`, never a real
  // `disabled` that would greyscale its highlight. The home page has no view
  // yet to show as selected, so there is nothing that look would protect, and
  // it greys out for real instead.
  const noViewYet = disabled && view == null;

  return (
    // The two views are the only way through the results, so they are navigation
    // rather than a pair of loose buttons.
    <nav className="scores-nav" aria-label="Results view">
      {isLiveMounted && (
        <div
          className={`scores-nav__live ${isWeekLive ? "" : "--collapsed"}`}
          style={
            {
              "--collapse-duration": `${COLLAPSE_DURATION_MS}ms`,
            } as CSSProperties
          }
          // On its way out it is still painted, so it has to stop being reachable
          // by pointer, keyboard, and screen reader on its own.
          inert={!isWeekLive}
        >
          <Button
            ariaLabel="Refresh"
            // Also unavailable mid-refresh, so a second click while one is
            // already running cannot queue another.
            ariaDisabled={disabled || isRefreshing}
            busy={isRefreshing}
            compact
            onClick={onRefresh}
            className="scores-nav__button"
          >
            <UpdateIcon />
          </Button>
          <div className="scores-nav__divider" />
        </div>
      )}
      <ViewButton
        view="Scoreboard"
        icon={<LeaderboardIcon />}
        label="Scoreboard"
        currentView={view}
        noViewYet={noViewYet}
        disabled={disabled}
        onViewChange={onViewChange}
      />
      <ViewButton
        view="Picks"
        icon={<FactCheckIcon />}
        label="Picks"
        currentView={view}
        noViewYet={noViewYet}
        disabled={disabled}
        onViewChange={onViewChange}
      />
    </nav>
  );
}
