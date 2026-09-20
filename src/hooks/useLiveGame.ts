import { useEffect, useRef, useState } from "react";
import { GameStatus } from "../types/ESPN";
import { League, WeekInfo } from "../types/League";
import { LeagueResult } from "../types/LeagueResult";
import { WeekGame } from "../types/WeekGame";
import { getLeagueResultsById } from "../utils/getLeagueResults";
import latestOnly from "../utils/latestOnly";

/** How often a game still being played is asked about again. */
export const POLL_MS = 20_000;

/**
 * The floor on how long `isGameLoading` stays set.
 *
 * Cleared at the later of this and the answer landing, so a slow request holds the
 * bar for its whole run. A poll the cache answers comes back in single
 * milliseconds, and a bar drawn for that long is gone before a reader sees it.
 */
export const LOADING_MS = 500;

/**
 * When a game ESPN has not started yet kicks off, for the poll to hold on to and
 * check the clock against.
 *
 * `null` for a game under way, which is asked about on every tick, and for a
 * kickoff `Date` ESPN gave nothing to parse, which no comparison can answer.
 */
export function kickoffAt(result: LeagueResult | null): number | null {
  if (result?.status !== GameStatus.UPCOMING) return null;
  const kickoff = result.date.getTime();
  return Number.isFinite(kickoff) ? kickoff : null;
}

/**
 * Everything the picks table draws off a game: the mark on its column heading, and
 * the score every pick under that heading is scored against.
 *
 * Compared as one string rather than field by field, since a move in any of them
 * costs the week the same rescore.
 */
function tableState(result: LeagueResult): string {
  return `${result.status}:${result.home.score}-${result.away.score}`;
}

/**
 * The games of one league the picks name, each at the freshest copy there is.
 *
 * What the poll is measured against and what decides how long it runs, since it
 * announces every game of its league rather than the watched one alone. The week's
 * own copy stands in for any game the last fetch did not answer for, and for every
 * game before the first fetch.
 */
function leagueWeek(
  games: Array<WeekGame>,
  league: League,
  fetched: Map<string, LeagueResult>,
): Array<LeagueResult> {
  return games.flatMap((game) => {
    if (game.league !== league || game.result == null) return [];
    return [fetched.get(game.result.id) ?? game.result];
  });
}

/**
 * Whether every game of the league's week is over, which is when the poll stops.
 *
 * Read across the league rather than off the watched game. A reader sitting on a
 * game that finished at four o'clock is still watching a table whose later games
 * are being played.
 */
function isWeekOver(week: Array<LeagueResult>): boolean {
  return week.every((result) => result.status === GameStatus.FINAL);
}

/**
 * When the league's week can next move, or `null` where it can move now.
 *
 * The earliest kickoff among the games that have not finished. A game under way, a
 * game ESPN has stopped, and a kickoff `Date` ESPN gave nothing to parse can each
 * move on the next poll, so any of them means nothing is waited on.
 */
function nextKickoff(week: Array<LeagueResult>): number | null {
  const waiting: Array<number> = [];
  for (const result of week) {
    if (result.status === GameStatus.FINAL) continue;
    const at = kickoffAt(result);
    if (at == null) return null;
    waiting.push(at);
  }
  return waiting.length > 0 ? Math.min(...waiting) : null;
}

/**
 * One game, kept up to date for as long as it is being looked at.
 *
 * The week's scores carry the game as it stood when they were worked out, which is
 * stale the moment a live game moves, so a game is fetched again as it is shown and
 * then on `POLL_MS`.
 *
 * How long the poll runs, and what it waits for, are the league's to say rather than
 * the watched game's, since one fetch answers for every game of that league. It
 * stops once they are all final, and a tick before the earliest of their kickoffs
 * asks nothing, because nothing that has not started can have moved. A league whose
 * games are all final when the dialog opens is never fetched at all.
 *
 * `shown` is the fresher answer alone. Nothing is returned until one lands, and the
 * caller shows the week's own copy of the game meanwhile, so a reader never waits
 * behind a fetch for a game they can already see.
 *
 * `games` is the scoring pass the answer belongs to. A rescore replaces every game,
 * so it takes the fetched one with it.
 *
 * A poll that finds any game of that league somewhere the week does not have it says
 * so through `onStatusChange`, which is how the picks table's column marks catch up
 * without a refresh. One scoreboard is the whole league's week, so every game of it
 * is measured, not the watched one alone. A reader watching one game still sees the
 * column beside it turn when the game under it moves.
 */
export default function useLiveGame({
  open,
  game,
  games,
  week,
  season,
  onStatusChange,
}: {
  open: boolean;
  game?: WeekGame;
  games?: Array<WeekGame>;
  week?: WeekInfo;
  season?: number;
  /**
   * Called when a poll finds any game of the watched game's league somewhere the
   * week's own scores do not have it, so those scores, the picks table's column
   * marks and the `.table__cell-wipe` animations can catch up to what the poll saw
   * before the next scheduled refresh would have.
   *
   * The rescore it sets off reads both leagues again, so a move in either one
   * reaches the table once anything at all has moved.
   *
   * Every move counts, not the final alone. A heading wears a mark for a game being
   * played and for one that has stopped, and a score that moves past the line turns
   * every pick under that heading, so a reader watching the table would otherwise be
   * told about none of it until they refreshed.
   */
  onStatusChange?: () => void;
}): { shown?: LeagueResult; isGameLoading: boolean } {
  // Held in a ref, not read from the deps below, since a rescore mints a new
  // callback that would tear down the poll and restart its wait each rescore.
  const onMoved = useRef(onStatusChange);
  useEffect(() => {
    onMoved.current = onStatusChange;
  }, [onStatusChange]);

  const [found, setFound] = useState<{
    games: Array<WeekGame>;
    label: string;
    result: LeagueResult;
  }>();
  const [fetching, setFetching] = useState(false);
  // Where each game was last announced to have got to. The rescore `onStatusChange`
  // sets off replaces every game, which restarts the poll below, and a rescore whose
  // own read of ESPN lags would otherwise be told the same move again without end.
  //
  // Keyed by game rather than held as one slot, since a reader can go back to a game
  // they have already watched move, and one slot would have forgotten it by then. It
  // holds the latest state rather than every state, so a game that goes live, stops
  // and starts again is announced all three times.
  const announced = useRef(new Map<string, string>());

  // The pieces the fetch needs, rather than the game itself, so a rebuilt object
  // cannot restart the poll on every render.
  const label = game?.label;
  const league = game?.league;
  const eventId = game?.result?.id;
  // A game the week was scored on after it finished cannot come back any other way,
  // so it is shown as the scoring pass left it rather than asked about again.
  const settled =
    game?.result?.status === GameStatus.FINAL ? game.result : undefined;

  useEffect(() => {
    if (!open || games == null || week == null) return;
    if (label == null || league == null || eventId == null) return;
    // Nothing in this league can move again, so there is nothing to poll for. The
    // watched game being over is not enough on its own: the week around it may
    // still be being played, and its columns are what the poll keeps in step.
    if (isWeekOver(leagueWeek(games, league, new Map()))) return;
    let timer = 0;
    let held = 0;
    // Null until the first fetch answers, so the poll always asks once before it
    // waits on anything. The week's own copy of a kickoff is what the scoring pass
    // read, and a game ESPN has already started is exactly the case the first ask
    // is for.
    let kickoff: number | null = null;
    const stop = latestOnly(async (isCurrent) => {
      const poll = async () => {
        // Nothing in the league has kicked off, so nothing can have moved and the
        // tick comes round asking nothing. Read across the league rather than off
        // the watched game, or a reader sitting on the Sunday night game would
        // suppress the afternoon's announcements all afternoon. The clock is read
        // here on every tick rather than once when the wait is set, so a suspended
        // tab or a changed clock cannot carry the poll more than `POLL_MS` past
        // the kickoff.
        if (kickoff != null && Date.now() < kickoff) {
          timer = window.setTimeout(poll, POLL_MS);
          return;
        }
        // The whole league's week, which is what one scoreboard answers with
        // whichever game was asked about. Empty where the fetch threw, which
        // announces nothing and leaves the game on screen as it was.
        let fetched = new Map<string, LeagueResult>();
        const asked = Date.now();
        // The bar says "Fetching the game", so it speaks only where the watched
        // game is what the answer can change. A poll running on behalf of the
        // week's other columns draws nothing over a game that is already over.
        const watching = settled == null;
        if (watching) setFetching(true);
        try {
          fetched = await getLeagueResultsById(league, week, season);
        } catch (error) {
          console.warn(`Failed to fetch the ${league} week`, error);
        }
        const result = fetched.get(eventId) ?? null;
        if (!isCurrent()) return;
        // Cleared on a delay rather than with the answer, so a poll the cache
        // answers at once still says it happened. The answer itself goes up
        // now, behind the bar this leaves standing.
        if (watching) {
          held = window.setTimeout(
            () => setFetching(false),
            Math.max(LOADING_MS - (Date.now() - asked), 0),
          );
        }
        if (result != null) {
          setFound({ games, label, result });
        }
        // Rescheduled from the end of a fetch rather than on an interval, so a
        // slow answer cannot leave two requests running at once. A game with no
        // answer at all is asked about again, since the next week's list may hold
        // it.
        const polledWeek = leagueWeek(games, league, fetched);
        kickoff = nextKickoff(polledWeek);
        // Every game the fetch answered for, measured against the last state
        // announced for it. The week's own copy stands in only until there is one.
        // It is a scoring pass behind whenever the rescore an announcement set off
        // has not landed, so a game that goes back to where the week still has it
        // would otherwise read as one that never moved.
        //
        // Walked to the end rather than stopped at the first game that moved, so
        // every mover is written down. One left unwritten would be announced again
        // on the next poll, rescoring the week for a move the first rescore carried.
        let moved = false;
        games.forEach((weekGame) => {
          // This league alone. The other league's games were never fetched, so
          // there is nothing to measure them against.
          if (weekGame.league !== league || weekGame.result == null) return;
          const polled = fetched.get(weekGame.result.id);
          if (polled == null) return;
          const now = tableState(polled);
          const last =
            announced.current.get(weekGame.result.id) ??
            tableState(weekGame.result);
          if (now === last) return;
          announced.current.set(weekGame.result.id, now);
          moved = true;
        });
        if (moved) {
          onMoved.current?.();
        }
        // Runs while any game of the league can still move, not while the watched
        // one can. The rescore an announcement asks for reads the whole week, so a
        // poll that stopped at the watched game's final would leave every later
        // column standing until the reader refreshed by hand.
        if (!isWeekOver(polledWeek)) {
          timer = window.setTimeout(poll, POLL_MS);
        }
      };
      await poll();
    });
    return () => {
      stop();
      window.clearTimeout(timer);
      window.clearTimeout(held);
      // The answer to the fetch this leaves behind is dropped, so nothing is
      // outstanding whatever it comes back with.
      setFetching(false);
    };
  }, [open, games, label, league, eventId, settled, week, season]);

  // Stamped with the game it was fetched for as well as the scoring pass, so an
  // answer that landed for the game before this one is never handed back for it.
  const shown =
    settled ??
    (found != null && found.games === games && found.label === label
      ? found.result
      : undefined);
  return { shown, isGameLoading: fetching };
}
