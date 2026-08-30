import { PropsWithChildren, useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useIsWinnerDecided } from "../../context/AppDataContext";
import { GameStatusContextProvider } from "../../context/GameStatusContext";
import { PlayerAnalysisContextProvider } from "../../context/PlayerAnalysisContext";
import { WeekInfo } from "../../types/League";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import doNothing from "../../utils/doNothing";
import getClasses from "../../utils/getClasses";
import GameStatusDialog from "../gameStatus/GameStatusDialog";
import LogoButton, { APP_NAME } from "../navbar/LogoButton";
import ScoresNavbar, { ScoresView } from "../navbar/ScoresNavbar";
import PageLayout from "../pageLayout/PageLayout";
import PlayerAnalysisDialog from "../playerAnalysis/PlayerAnalysisDialog";
import SkeletonTable from "../table/SkeletonTable";
import "./ResultsFrame.scss";

/** The pool the app scores, which is not the app's own name. */
const POOL_NAME = "Rak Madness";

/** What the caption is sized from on a route that does not know the week yet. */
const CAPTION_STAND_IN = `${POOL_NAME} · 0000 Season · Week 00`;

/**
 * What the tables have opened, which is one thing at a time.
 *
 * Held as one piece of state rather than one per dialog, because two open dialogs
 * would mean two backdrops, two scroll locks, and two claims on the viewport
 * insets, with whichever closed last taking them out from under the other.
 */
type Opened =
  { kind: "player"; name: string } | { kind: "game"; label: string };

/**
 * The page a week's results are shown on, and the wireframe that stands in for
 * them.
 *
 * Shared by every route that can end up waiting, so the wireframe a redirect
 * shows while it works out where it is going is the same one the results
 * themselves arrive in.
 */
export default function ResultsFrame({
  view,
  isReady = false,
  onViewChange = doNothing,
  onRefresh = doNothing,
  isRefreshing = false,
  scores,
  week,
  season,
  children,
}: PropsWithChildren<{
  view: ScoresView;
  /** Left false by a route that has nothing to show and never will. */
  isReady?: boolean;
  onViewChange?: (view: ScoresView) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /** What the player analysis is worked out from. Absent while a week loads. */
  scores?: RakMadnessScores;
  /** The week the scores are for, which fetching one of its games again needs. */
  week?: WeekInfo;
  season?: number;
}>) {
  const navigate = useNavigate();
  // Absent on the redirect routes, which render this frame before they know which
  // week they are headed for.
  const { season: seasonParam, week: weekParam } = useParams();
  const hasWeek = Boolean(seasonParam && weekParam);
  // Once every game is final there is nothing left to fetch, so the refresh button
  // and the divider beside it go rather than sit there doing nothing.
  const isWinnerDecided = useIsWinnerDecided();
  const [opened, setOpened] = useState<Opened>();

  // Stable, so the memoized tables below do not re-render for a dialog opening.
  const showPlayerAnalysis = useCallback(
    (name: string) => setOpened({ kind: "player", name }),
    [],
  );
  const showGameStatus = useCallback(
    (label: string) => setOpened({ kind: "game", label }),
    [],
  );
  // Cleared on the way out, so opening on the same subject again is a change the
  // dialog can see.
  const close = useCallback((isOpen: boolean) => {
    if (!isOpen) setOpened(undefined);
  }, []);

  return (
    <PageLayout
      title={
        hasWeek
          ? `${seasonParam} Week ${weekParam} ${view}`
          : `${APP_NAME} ${view}`
      }
      // True while loading too: the wireframe is shaped like the table it stands
      // in for, so it wants the same content area.
      showingScores
      scrollable={isReady}
      // TEMPORARY, do not commit: the live-week gate is off so a finished week
      // can be pulled on for device testing. Restore `isReady && !isWinnerDecided`.
      pull={isReady ? { onRefresh, isRefreshing } : undefined}
      navbarLeft={<LogoButton onClick={() => navigate("/")} />}
      navbarRight={
        // Rendered while the week loads, so the navbar does not change shape
        // under the pointer once it arrives. Disabled until there is something to
        // switch between.
        <ScoresNavbar
          view={view}
          disabled={!isReady}
          isWeekLive={!isWinnerDecided}
          onViewChange={onViewChange}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      }
    >
      <div className="results-scores">
        {/*
          Which week this is, for everyone who cannot hear the `<h1>` above. Hidden
          from a screen reader because that heading already says it, and says the
          view too.

          Not held back until the scores land: the week is in the URL before they
          are, so the wireframe wears the caption the table will and nothing under
          it moves when the week arrives.
        */}
        <p
          className={getClasses("results-caption", { "--loading": !hasWeek })}
          data-skeleton-text={hasWeek ? undefined : CAPTION_STAND_IN}
          aria-hidden="true"
        >
          {hasWeek && (
            <span className="results-caption__text">
              {`${POOL_NAME} · ${seasonParam} Season · Week ${weekParam}`}
            </span>
          )}
        </p>
        <PlayerAnalysisContextProvider showPlayerAnalysis={showPlayerAnalysis}>
          <GameStatusContextProvider showGameStatus={showGameStatus}>
            {isReady ? children : <SkeletonTable view={view} />}
          </GameStatusContextProvider>
        </PlayerAnalysisContextProvider>
      </div>
      <PlayerAnalysisDialog
        open={opened?.kind === "player"}
        onOpenChange={close}
        player={opened?.kind === "player" ? opened.name : undefined}
        scores={scores}
        weekNumber={weekParam != null ? Number(weekParam) : undefined}
      />
      <GameStatusDialog
        open={opened?.kind === "game"}
        onOpenChange={close}
        gameLabel={opened?.kind === "game" ? opened.label : undefined}
        scores={scores}
        week={week}
        season={season}
        onGameFinal={onRefresh}
      />
    </PageLayout>
  );
}
