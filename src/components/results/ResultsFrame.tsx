import {
  PropsWithChildren,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router";
import { useIsWinnerDecided } from "../../context/AppDataContext";
import { errorToast, useToastActions } from "../../context/ToastContext";
import { GameStatusContextProvider } from "../../context/GameStatusContext";
import { PlayerAnalysisContextProvider } from "../../context/PlayerAnalysisContext";
import useWarmTeamLogos from "../../hooks/useWarmTeamLogos";
import { WeekInfo } from "../../types/League";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import doNothing from "../../utils/doNothing";
import getClasses from "../../utils/getClasses";
import LogoButton, { APP_NAME } from "../navbar/LogoButton";
import ScoresNavbar, { ScoresView } from "../navbar/ScoresNavbar";
import PageLayout from "../pageLayout/PageLayout";
import SkeletonTable from "../table/SkeletonTable";
import DialogLoadBoundary from "./DialogLoadBoundary";
import "./ResultsFrame.scss";

/*
  Neither dialog is on the path to a table, and between them they carry Base UI's
  combobox, the whole of `getPlayerAnalysis`, and the scoreline: 18kB gzipped of
  the chunk every route waits on, including the home page, which has no dialog to
  open at all.

  Held apart from the loaders below so the warm and the render ask for the same
  module. `lazy` alone would leave the first click waiting on the fetch.
*/
const loadPlayerAnalysisDialog = () =>
  import("../playerAnalysis/PlayerAnalysisDialog");
const loadGameStatusDialog = () => import("../gameStatus/GameStatusDialog");
const PlayerAnalysisDialog = lazy(loadPlayerAnalysisDialog);
const GameStatusDialog = lazy(loadGameStatusDialog);

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
  // Which dialogs have been opened at all, and so which are past their fetch.
  // Kept once set rather than following `opened`, because Base UI plays the close
  // animation from a dialog still mounted, and unmounting on close would cut it.
  const [hasOpened, setHasOpened] = useState({ player: false, game: false });
  if (opened?.kind === "player" && !hasOpened.player) {
    setHasOpened((seen) => ({ ...seen, player: true }));
  }
  if (opened?.kind === "game" && !hasOpened.game) {
    setHasOpened((seen) => ({ ...seen, game: true }));
  }

  // The logos belong to the week rather than to the dialog that draws them, so
  // they are warmed from here. `useWarmTeamLogos` says why.
  useWarmTeamLogos(scores?.games);

  const { showToast } = useToastActions();
  // Said once, for either dialog. Neither can be retried, so the only way on is a
  // reload.
  const onDialogLoadError = useCallback(() => {
    showToast(errorToast("Failed to open that. Reload the page to try again."));
  }, [showToast]);

  // Fetched as soon as the page is quiet, so a reader who opens a dialog finds it
  // already there. Without this the split would trade the load every reader pays
  // for a wait the ones who open a dialog pay.
  useEffect(() => {
    // A failed fetch is caught rather than left to the console. It costs the
    // reader nothing here, because the click that opens the dialog asks for the
    // module again.
    const warm = () => {
      loadPlayerAnalysisDialog().catch(doNothing);
      loadGameStatusDialog().catch(doNothing);
    };
    if (typeof window.requestIdleCallback !== "function") {
      const timer = window.setTimeout(warm, 0);
      return () => window.clearTimeout(timer);
    }
    const handle = window.requestIdleCallback(warm);
    return () => window.cancelIdleCallback(handle);
  }, []);

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
      showingResults
      scrollable={isReady}
      // Exact parity with the refresh button beside it: the same live week, and
      // only once there is a table to pull on.
      pull={
        isReady && !isWinnerDecided ? { onRefresh, isRefreshing } : undefined
      }
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
      {/* No fallback: the dialog is what a reader is waiting for, and a spinner
          where it will be reads as the dialog having opened empty. */}
      {hasOpened.player && (
        <DialogLoadBoundary onError={onDialogLoadError}>
          <Suspense fallback={null}>
            <PlayerAnalysisDialog
              open={opened?.kind === "player"}
              onOpenChange={close}
              player={opened?.kind === "player" ? opened.name : undefined}
              scores={scores}
              weekNumber={weekParam != null ? Number(weekParam) : undefined}
            />
          </Suspense>
        </DialogLoadBoundary>
      )}
      {hasOpened.game && (
        <DialogLoadBoundary onError={onDialogLoadError}>
          <Suspense fallback={null}>
            <GameStatusDialog
              open={opened?.kind === "game"}
              onOpenChange={close}
              gameLabel={opened?.kind === "game" ? opened.label : undefined}
              scores={scores}
              week={week}
              season={season}
              onGameFinal={onRefresh}
            />
          </Suspense>
        </DialogLoadBoundary>
      )}
    </PageLayout>
  );
}
