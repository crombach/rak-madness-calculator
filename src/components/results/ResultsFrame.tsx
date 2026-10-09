import {
  ComponentProps,
  PropsWithChildren,
  ReactNode,
  Suspense,
  lazy,
  memo,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router";
import {
  useIsWeekSettled,
  useScoringStatus,
} from "../../context/AppDataContext";
import { useSettings } from "../../context/SettingsContext";
import { errorToast, useToastActions } from "../../context/ToastContext";
import { GameStatusContextProvider } from "../../context/GameStatusContext";
import { PlayerAnalysisContextProvider } from "../../context/PlayerAnalysisContext";
import { scoringFailedMessage } from "../../hooks/usePlayerScores";
import useWarmTeamLogos from "../../hooks/useWarmTeamLogos";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import doNothing from "../../utils/doNothing";
import getClasses from "../../utils/getClasses";
import SEPARATOR from "../../utils/separator";
import ComparePlayersSkeleton from "../comparePlayers/ComparePlayersSkeleton";
import GamesSkeleton from "../games/GamesSkeleton";
import { gamesPage } from "../games/GamesPage";
import { knockoutsPage } from "../knockouts/KnockoutsPage";
import { comparePlayersPage } from "../comparePlayers/ComparePlayersPage";
import Button from "../button/Button";
import AppNavbar from "../navbar/AppNavbar";
import EmptyState from "../pageLayout/EmptyState";
import { APP_NAME } from "../navbar/LogoButton";
import KnockoutsSkeleton from "../knockouts/KnockoutsSkeleton";
import SkeletonTable from "../table/SkeletonTable";
import DialogLoadBoundary from "./DialogLoadBoundary";
import {
  RESULTS_PAGE,
  ResultsPage,
  ScoresView,
  isScoresView,
  weekName,
} from "./resultsPath";
import "./ResultsFrame.scss";

/*
  Neither dialog is on the path to a table. Between them they carry Base UI's
  combobox, the whole of `getPlayerAnalysis`, and the scoreline. That's 18kB
  gzipped of the chunk every route waits on, including the home page, which has no
  dialog to open at all.

  Held apart from the loaders below so the warm and the render ask for the same
  module. `lazy` alone would leave the first click waiting on the fetch.
*/
const loadPlayerAnalysisDialog = () =>
  import("../playerAnalysis/PlayerAnalysisDialog");
const loadGameStatusDialog = () => import("../gameStatus/GameStatusDialog");
const PlayerAnalysisDialog = lazy(loadPlayerAnalysisDialog);
const GameStatusDialog = lazy(loadGameStatusDialog);

/** The wireframe each page stands as while its week loads. */
export const SKELETONS: Record<ResultsPage, ReactNode> = {
  [RESULTS_PAGE.scoreboard]: <SkeletonTable view={RESULTS_PAGE.scoreboard} />,
  [RESULTS_PAGE.picks]: <SkeletonTable view={RESULTS_PAGE.picks} />,
  [RESULTS_PAGE.knockouts]: <KnockoutsSkeleton />,
  [RESULTS_PAGE.games]: <GamesSkeleton />,
  [RESULTS_PAGE.comparePlayers]: <ComparePlayersSkeleton />,
};

/**
 * The pages whose code is fetched apart. The frame holds its own wireframe until
 * that code is in too. Handed off sooner, the page's own fallback mounts a fresh
 * copy of the same wireframe, and its sheen starts over.
 */
const LAZY_PAGES: Partial<
  Record<
    ResultsPage,
    { preload: () => Promise<unknown>; isLoaded: () => boolean }
  >
> = {
  [RESULTS_PAGE.knockouts]: knockoutsPage,
  [RESULTS_PAGE.games]: gamesPage,
  [RESULTS_PAGE.comparePlayers]: comparePlayersPage,
};

/**
 * Whether `view`'s code is in, fetched alongside the week rather than after it. A
 * fetch that fails answers true as well, so the page's own `lazy` asks again.
 */
function usePageCode(view: ResultsPage): boolean {
  const page = LAZY_PAGES[view];
  const [settled, setSettled] = useState<ResultsPage>();
  const isIn = page == null || page.isLoaded() || settled === view;
  useEffect(() => {
    if (isIn || page == null) return;
    let isOnScreen = true;
    page
      .preload()
      .catch(doNothing)
      .finally(() => {
        if (isOnScreen) setSettled(view);
      });
    return () => {
      isOnScreen = false;
    };
  }, [isIn, page, view]);
  return isIn;
}

/**
 * The Game Status dialog, with the poll it drives and the leagues in flight read
 * here. Their flags change on every poll, and the frame is memoized against that.
 */
function GameStatusSlot(
  props: Omit<
    ComponentProps<typeof GameStatusDialog>,
    "fetchingLeagues" | "onPoll"
  >,
) {
  const { fetchingLeagues, rescore } = useScoringStatus();
  return (
    <GameStatusDialog
      {...props}
      fetchingLeagues={fetchingLeagues}
      onPoll={rescore}
    />
  );
}

/** What the caption is sized from on a route that does not know the week yet. */
const CAPTION_STAND_IN = `Scoreboard${SEPARATOR}0000 Season${SEPARATOR}Week 00`;

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
 * Shared by every route that can end up waiting. A redirect shows this wireframe
 * while it works out where it is going. The results arrive in that same
 * wireframe.
 */
export default memo(function ResultsFrame({
  view,
  isReady = false,
  hasFailed = false,
  onViewChange = doNothing,
  onRefresh = doNothing,
  isRefreshing = false,
  scores,
  children,
}: PropsWithChildren<{
  view: ResultsPage;
  /** Left false by a route that has nothing to show and never will. */
  isReady?: boolean;
  /** Set where the week could not be scored. Shown in place of the wireframe. */
  hasFailed?: boolean;
  onViewChange?: (view: ScoresView) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  /** What the player analysis is worked out from. Absent while a week loads. */
  scores?: RakMadnessScores;
}>) {
  // Absent on the redirect routes, which render this frame before they know which
  // week they are headed for.
  const { season: seasonParam, week: weekParam } = useParams();
  const navigate = useNavigate();
  const hasWeek = Boolean(seasonParam && weekParam);
  const scoresView: ScoresView | null = isScoresView(view) ? view : null;
  // Once every game is final there is nothing left to fetch, so the refresh button
  // and the divider beside it go rather than sit there doing nothing.
  const isWeekSettled = useIsWeekSettled();
  // The card pages poll on their own, so they offer no refresh of their own either.
  const canRefresh =
    !isWeekSettled &&
    view !== RESULTS_PAGE.games &&
    view !== RESULTS_PAGE.knockouts;
  const [opened, setOpened] = useState<Opened>();
  // Set once both dialogs are fetched, which mounts them closed. Each one reads
  // the week as it mounts, and `PlayerAnalysisDialog` walks every pick of every
  // player to do it, so a mount held back until the click would put that walk
  // between the click and the dialog.
  const [hasLoaded, setHasLoaded] = useState(false);
  // Which dialogs have opened, for the click that beats the fetch. Kept once
  // set, unlike `opened`, since unmounting would cut Base UI's close animation.
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

  const hasPageCode = usePageCode(view);

  const { showToast } = useToastActions();
  // Said once, for either dialog. Neither can be retried, so the only way on is a
  // reload.
  const onDialogLoadError = useCallback(() => {
    showToast(errorToast("Failed to open that. Reload the page to try again."));
  }, [showToast]);

  const { experimentalFeatures } = useSettings();

  // Fetched once the first table has painted and the page is quiet, so opening a
  // dialog waits for neither fetch nor mount, and the load does not share its
  // bandwidth. The menu's pages come with them.
  useEffect(() => {
    if (!isReady) return;
    let isOnScreen = true;
    // A failed fetch leaves both dialogs unmounted, and the click that wants one
    // asks for its module again. `DialogLoadBoundary` holds it if that fails too.
    const warm = () => {
      gamesPage.preload().catch(doNothing);
      knockoutsPage.preload().catch(doNothing);
      if (experimentalFeatures) comparePlayersPage.preload().catch(doNothing);
      Promise.all([loadPlayerAnalysisDialog(), loadGameStatusDialog()])
        .then(() => {
          if (isOnScreen) setHasLoaded(true);
        })
        .catch(doNothing);
    };
    if (typeof window.requestIdleCallback !== "function") {
      const timer = window.setTimeout(warm, 0);
      return () => {
        isOnScreen = false;
        window.clearTimeout(timer);
      };
    }
    const handle = window.requestIdleCallback(warm);
    return () => {
      isOnScreen = false;
      window.cancelIdleCallback(handle);
    };
  }, [isReady, experimentalFeatures]);

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
    <AppNavbar
      title={
        hasWeek
          ? `${seasonParam} Week ${weekParam} ${view}`
          : `${APP_NAME} ${view}`
      }
      // True while loading too. The wireframe is shaped like the table it stands
      // in for, so it wants the same content area.
      showingResults
      scrollable={isReady}
      scrollKey={scoresView ? "scores" : view}
      // This matches the refresh button beside it exactly. Both gate on the
      // same live week, and only once there is a table to pull on.
      pull={isReady && canRefresh ? { onRefresh, isRefreshing } : undefined}
      // Rendered while the week loads too, so the navbar's shape won't shift under
      // the pointer once it lands. Disabled until there's anything to switch to.
      view={scoresView}
      disabled={!isReady}
      isWeekLive={canRefresh}
      onViewChange={onViewChange}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
      season={seasonParam}
      week={weekParam}
      pagesDisabled={!hasWeek}
    >
      <div className="results-scores">
        {/*
          Which week this is, for everyone who cannot hear the `<h1>` above. Hidden
          from a screen reader because that heading already says it, and says the
          view too.

          Not held back until the scores land. The week is in the URL before they
          are, so the wireframe wears the caption the table will and nothing under
          it moves when the week arrives.
        */}
        <p
          className={getClasses("results-caption", { "--loading": !hasWeek })}
          data-skeleton-text={hasWeek ? undefined : CAPTION_STAND_IN}
          aria-hidden="true"
        >
          {seasonParam && weekParam && (
            <span className="results-caption__text">
              {`${view}${SEPARATOR}${weekName(seasonParam, weekParam)}`}
            </span>
          )}
        </p>
        <PlayerAnalysisContextProvider showPlayerAnalysis={showPlayerAnalysis}>
          <GameStatusContextProvider showGameStatus={showGameStatus}>
            {isReady && hasPageCode ? (
              children
            ) : hasFailed ? (
              <div className="results-failure">
                <EmptyState>{scoringFailedMessage(weekParam ?? "")}</EmptyState>
                <div className="results-failure__actions">
                  <Button onClick={onRefresh} busy={isRefreshing}>
                    Retry
                  </Button>
                  <Button onClick={() => navigate("/")}>Home</Button>
                </div>
              </div>
            ) : (
              SKELETONS[view]
            )}
          </GameStatusContextProvider>
        </PlayerAnalysisContextProvider>
      </div>
      {/* No fallback. Nothing is on screen to stand in for. A dialog mounts
          closed, and the click that beats the fetch wants the dialog rather than
          a spinner where it will be. */}
      {(hasLoaded || hasOpened.player) && (
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
      {(hasLoaded || hasOpened.game) && (
        <DialogLoadBoundary onError={onDialogLoadError}>
          <Suspense fallback={null}>
            <GameStatusSlot
              open={opened?.kind === "game"}
              onOpenChange={close}
              gameLabel={opened?.kind === "game" ? opened.label : undefined}
              scores={scores}
            />
          </Suspense>
        </DialogLoadBoundary>
      )}
    </AppNavbar>
  );
});
