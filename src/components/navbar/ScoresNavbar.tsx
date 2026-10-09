import {
  CSSProperties,
  ReactNode,
  startTransition,
  useEffect,
  useOptimistic,
  useState,
} from "react";
import { FactCheckIcon, LeaderboardIcon, UpdateIcon } from "../icon/Icon";
import Button from "../button/Button";
import "./ScoresNavbar.scss";
import getClasses from "../../utils/getClasses";
import { RESULTS_PAGE, ScoresView } from "../results/resultsPath";

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
  noWeekYet,
  disabled,
  onViewChange,
}: {
  view: ScoresView;
  icon: ReactNode;
  label: string;
  currentView: ScoresView | null;
  noWeekYet: boolean;
  disabled: boolean;
  onViewChange: (view: ScoresView) => void;
}) {
  return (
    <Button
      // A loading results route keeps its view highlighted, so only `aria-disabled`
      // marks it. The home page, with no week yet, grays out for real instead.
      disabled={noWeekYet}
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
  noWeekYet = false,
  isWeekLive,
}: {
  /** `null` where neither view is open, so neither button reads as selected. */
  view: ScoresView | null;
  /**
   * Navigate synchronously. An update after an await leaves the transition and
   * the tapped key falls back.
   */
  onViewChange: (view: ScoresView) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  /** Set while a week is still loading, so the navbar keeps its shape. */
  disabled?: boolean;
  /** Set where there is no week to switch to at all, so both views gray out. */
  noWeekYet?: boolean;
  /** Cleared once the week is over, when rescoring cannot change anything. */
  isWeekLive: boolean;
}) {
  // A week arrives loading, so this is usually on screen before it's decided, kept
  // through the collapse to animate out. Skipped once already decided.
  const [isLiveMounted, setLiveMounted] = useState(isWeekLive);
  if (isWeekLive && !isLiveMounted) setLiveMounted(true);
  useEffect(() => {
    if (isWeekLive || !isLiveMounted) return;
    const timer = setTimeout(() => setLiveMounted(false), COLLAPSE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isWeekLive, isLiveMounted]);

  // The chosen key goes down in the click's own render. The router commits the
  // page in a transition, a tick or more after the finger lifts, and a key that
  // waited for it would rise in between and then drop again.
  const [shownView, showView] = useOptimistic(view);
  const choose = (next: ScoresView) =>
    startTransition(() => {
      showView(next);
      onViewChange(next);
    });

  return (
    // The two views are the only way through the results, so they are navigation
    // rather than a pair of loose buttons.
    <nav className="scores-nav" aria-label="Results view">
      {isLiveMounted && (
        <div
          className={getClasses(
            "scores-nav__live",
            !isWeekLive && "--collapsed",
          )}
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
          <div className="navbar__divider" />
        </div>
      )}
      <ViewButton
        view={RESULTS_PAGE.scoreboard}
        icon={<LeaderboardIcon />}
        label={RESULTS_PAGE.scoreboard}
        currentView={shownView}
        noWeekYet={noWeekYet}
        disabled={disabled}
        onViewChange={choose}
      />
      <ViewButton
        view={RESULTS_PAGE.picks}
        icon={<FactCheckIcon />}
        label={RESULTS_PAGE.picks}
        currentView={shownView}
        noWeekYet={noWeekYet}
        disabled={disabled}
        onViewChange={choose}
      />
    </nav>
  );
}
