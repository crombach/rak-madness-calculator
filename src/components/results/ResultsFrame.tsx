import {
  ComponentProps,
  PropsWithChildren,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router";
import {
  useIsWeekSettled,
  useScoringStatus,
} from "../../context/AppDataContext";
import { useSetting } from "../../context/SettingsContext";
import { GameStatusContextProvider } from "../../context/GameStatusContext";
import { PlayerAnalysisContextProvider } from "../../context/PlayerAnalysisContext";
import { scoringFailedMessage } from "../../hooks/usePlayerScores";
import useWarmTeamLogos from "../../hooks/useWarmTeamLogos";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import doNothing from "../../utils/doNothing";
import getClasses from "../../utils/getClasses";
import SEPARATOR from "../../utils/separator";
import { gamesPage } from "../games/GamesPage";
import { knockoutsPage } from "../knockouts/KnockoutsPage";
import { comparePlayersPage } from "../comparePlayers/ComparePlayersPage";
import Button from "../button/Button";
import { useAppNavbar } from "../navbar/AppNavbar";
import EmptyState from "../pageLayout/EmptyState";
import PageLayout from "../pageLayout/PageLayout";
import { APP_NAME } from "../navbar/LogoButton";
import lazyDialog from "../dialog/lazyDialog";
import LoadBoundary from "../../utils/LoadBoundary";
import {
  RESULTS_PAGE,
  ResultsPage,
  ScoresView,
  isScoresView,
  weekName,
} from "./resultsPath";
import SKELETONS from "./resultsSkeletons";
import "./ResultsFrame.scss";

/*
  Neither dialog is on the path to a table. Between them they carry Base UI's
  combobox, the whole of `getPlayerAnalysis`, and the scoreline. That's 18kB
  gzipped of the chunk every route waits on, including the home page, which has no
  dialog to open at all.

  Warmed below, so the first click does not wait on the fetch.
*/
const playerAnalysisDialog = lazyDialog(
  () => import("../playerAnalysis/PlayerAnalysisDialog"),
);
const gameStatusDialog = lazyDialog(
  () => import("../gameStatus/GameStatusDialog"),
);
const PlayerAnalysisDialog = playerAnalysisDialog.Dialog;
const GameStatusDialog = gameStatusDialog.Dialog;

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

/** What a page says in its place when its chunk fails to load, or it throws. */
export const PAGE_ERROR =
  "Failed to show this page. Reload the page to try again.";

/** A failure in place of the page, with `children` as the way on and Home. */
function ResultsFailure({
  message,
  children,
}: PropsWithChildren<{ message: string }>) {
  const navigate = useNavigate();
  return (
    <div className="results-failure">
      <EmptyState>{message}</EmptyState>
      <div className="results-failure__actions">
        {children}
        <Button onClick={() => navigate("/")}>Home</Button>
      </div>
    </div>
  );
}

/** The scroll offset the scoreboard and the picks share. */
const SCORES_SCROLL_KEY = "scores";

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
 * Rendered by `ResultsLayout` for every results route, including the shortcut
 * routes and a bare week URL, so one frame stays mounted until the page lands.
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
  // Absent on the shortcut routes, which render this frame before they know which
  // week they are headed for.
  const { season: seasonParam, week: weekParam } = useParams();
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

  const experimentalFeatures = useSetting("experimentalFeatures");

  // Fetched ahead, alongside the week, so the menu's link lands on the page
  // rather than on a frame of wireframe while its chunk arrives.
  useEffect(() => {
    gamesPage.preload().catch(doNothing);
  }, []);

  // Fetched once the week is ready or failed, and the browser is idle, so the
  // load does not share bandwidth with the week's. Knockouts comes with them.
  const canWarm = isReady || hasFailed;
  const hasWarmed = useRef(false);
  useEffect(() => {
    if (!canWarm || hasWarmed.current) return;
    // A failed fetch leaves both dialogs unmounted, and the click that wants one
    // asks for its module again. `lazyDialog` holds it if that fails too.
    const warm = () => {
      hasWarmed.current = true;
      knockoutsPage.preload().catch(doNothing);
      Promise.all([playerAnalysisDialog.preload(), gameStatusDialog.preload()])
        .then(() => setHasLoaded(true))
        .catch(doNothing);
    };
    if (typeof window.requestIdleCallback !== "function") {
      const timer = window.setTimeout(warm, 0);
      return () => window.clearTimeout(timer);
    }
    const handle = window.requestIdleCallback(warm);
    return () => window.cancelIdleCallback(handle);
  }, [canWarm]);

  // Apart from the warm above, so turning βeta Mode on fetches only this.
  const hasWarmedCompare = useRef(false);
  useEffect(() => {
    if (!canWarm || !experimentalFeatures || hasWarmedCompare.current) return;
    hasWarmedCompare.current = true;
    comparePlayersPage.preload().catch(doNothing);
  }, [canWarm, experimentalFeatures]);

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

  // The card pages poll, and a poll sets `isRefreshing`, so passing it there would
  // re-render the navbar on every poll. A refresh begun where the key shows stays
  // busy until it ends, through the key's collapse too.
  const [wasKeyBusy, setKeyBusy] = useState(false);
  const isKeyBusy = isRefreshing && (canRefresh || wasKeyBusy);
  if (isKeyBusy !== wasKeyBusy) setKeyBusy(isKeyBusy);

  useAppNavbar({
    // Rendered while the week loads too, so the navbar's shape won't shift under
    // the pointer once it lands. Disabled until there's anything to switch to.
    view: scoresView,
    disabled: !isReady,
    isWeekLive: canRefresh,
    onViewChange,
    onRefresh,
    isRefreshing: isKeyBusy,
    season: seasonParam,
    week: weekParam,
    pagesDisabled: !hasWeek,
  });

  return (
    <PageLayout
      title={
        hasWeek
          ? `${seasonParam} Week ${weekParam} ${view}`
          : `${APP_NAME} ${view}`
      }
      // True while loading too. The wireframe is shaped like the table it stands
      // in for, so it wants the same content area.
      showingResults
      scrollable={isReady}
      scrollKey={scoresView ? SCORES_SCROLL_KEY : view}
      // This matches the refresh button beside it exactly. Both gate on the
      // same live week, and only once there is a table to pull on.
      pull={isReady && canRefresh ? { onRefresh, isRefreshing } : undefined}
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
              // Keyed by page and week, so moving on from one that failed draws
              // the next afresh.
              <LoadBoundary
                key={`${view}:${seasonParam}:${weekParam}`}
                fallback={
                  <ResultsFailure message={PAGE_ERROR}>
                    <Button onClick={() => window.location.reload()}>
                      Reload
                    </Button>
                  </ResultsFailure>
                }
              >
                {children}
              </LoadBoundary>
            ) : hasFailed ? (
              <ResultsFailure message={scoringFailedMessage(weekParam ?? "")}>
                <Button onClick={onRefresh} busy={isRefreshing}>
                  Retry
                </Button>
              </ResultsFailure>
            ) : (
              SKELETONS[view]
            )}
          </GameStatusContextProvider>
        </PlayerAnalysisContextProvider>
      </div>
      {(hasLoaded || hasOpened.player) && (
        <PlayerAnalysisDialog
          open={opened?.kind === "player"}
          onOpenChange={close}
          player={opened?.kind === "player" ? opened.name : undefined}
          scores={scores}
          weekNumber={weekParam != null ? Number(weekParam) : undefined}
        />
      )}
      {(hasLoaded || hasOpened.game) && (
        <GameStatusSlot
          open={opened?.kind === "game"}
          onOpenChange={close}
          gameLabel={opened?.kind === "game" ? opened.label : undefined}
          scores={scores}
        />
      )}
    </PageLayout>
  );
});
