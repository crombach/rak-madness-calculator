import { useEffect, useRef, useState } from "react";
import { GameStatus } from "../types/ESPN";
import { League } from "../types/League";
import { LeagueResult } from "../types/LeagueResult";
import { WeekGame } from "../types/WeekGame";
import latestOnly from "../utils/latestOnly";
import { LEAGUE_KEY, LeagueResults } from "../utils/scoring/leagueResults";

/** How often a game still being played is asked about again. */
export const POLL_MS = 20_000;

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
 * The games of one league the picks name, each at the freshest copy there is.
 *
 * What the poll is measured against and what decides how long it runs, since one
 * scoreboard answers for every game of its league rather than the watched one
 * alone. The week's own copy stands in for any game the last fetch did not answer
 * for, and for every game before the first fetch.
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

/** A league's games under ESPN's id for each, which is how the week holds them. */
function byId(
  results: LeagueResults | undefined,
  league: League,
): Map<string, LeagueResult> {
  const found = new Map<string, LeagueResult>();
  results?.[LEAGUE_KEY[league]].forEach((result) => {
    found.set(result.id, result);
  });
  return found;
}

/**
 * One game, kept up to date for as long as it is being looked at.
 *
 * The week's scores carry the game as it stood when they were worked out, which is
 * stale the moment a live game moves, so the league is fetched again as the game is
 * shown and then on `POLL_MS`.
 *
 * `onPoll` is the app's one refresh, told to fetch this league and no other. It
 * rescores the week where anything moved, which is how the picks table's column
 * marks and its `.table__cell-wipe` animations catch up without a refresh. It
 * resolves to what it fetched, so a clock and a down that no rescore is owed for
 * still reach the screen.
 *
 * How long the poll runs, and what it waits for, are the league's to say rather
 * than the watched game's, since one fetch answers for every game of that league.
 * It stops once they are all final, and a tick before the earliest of their
 * kickoffs asks nothing, because nothing that has not started can have moved. A
 * league whose games are all final when the dialog opens is never fetched at all.
 *
 * `shown` is the fresher answer alone. Nothing is returned until one lands, and the
 * caller shows the week's own copy of the game meanwhile, so a reader never waits
 * behind a fetch for a game they can already see.
 */
export default function useLiveGame({
  open,
  game,
  games,
  onPoll,
}: {
  open: boolean;
  game?: WeekGame;
  games?: Array<WeekGame>;
  onPoll?: (
    leagues: ReadonlyArray<League>,
  ) => Promise<LeagueResults | undefined>;
}): { shown?: LeagueResult } {
  // Read inside the tick rather than from the deps below. A pass that rescores
  // replaces every game, and with `games` in the deps that would tear the poll
  // down and restart its wait on every pass.
  const weekGames = useRef(games);
  const poll = useRef(onPoll);
  useEffect(() => {
    weekGames.current = games;
    poll.current = onPoll;
  }, [games, onPoll]);

  const [found, setFound] = useState<{
    games?: Array<WeekGame>;
    label: string;
    result: LeagueResult;
  }>();

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
    if (!open) return;
    if (label == null || league == null || eventId == null) return;
    const atStart = weekGames.current;
    if (atStart == null) return;
    // Nothing in this league can move again, so there is nothing to poll for. The
    // watched game being over is not enough on its own: the week around it may
    // still be being played, and its columns are what the poll keeps in step.
    if (isWeekOver(leagueWeek(atStart, league, new Map()))) return;
    let timer = 0;
    // Null until the first fetch answers, so the poll always asks once before it
    // waits on anything. The week's own copy of a kickoff is what the scoring pass
    // read, and a game ESPN has already started is exactly the case the first ask
    // is for.
    let kickoff: number | null = null;
    const stop = latestOnly(async (isCurrent) => {
      const tick = async () => {
        // Nothing in the league has kicked off, so nothing can have moved and the
        // tick comes round asking nothing. Read across the league rather than off
        // the watched game, or a reader sitting on the Sunday night game would
        // hold up the afternoon's rescores all afternoon. The clock is read here
        // on every tick rather than once when the wait is set, so a suspended tab
        // or a changed clock cannot carry the poll more than `POLL_MS` past the
        // kickoff.
        if (kickoff != null && Date.now() < kickoff) {
          timer = window.setTimeout(tick, POLL_MS);
          return;
        }
        // Undefined where a pass in flight turned this one away, or where the
        // fetch failed. Either way nothing moves on screen and the next tick asks
        // again.
        // A refresh that throws must not take the poll down with it. Nothing on
        // screen moves, and the next tick asks again.
        let fetched: LeagueResults | undefined;
        try {
          fetched = await poll.current?.([league]);
        } catch (error) {
          console.warn(`Failed to poll the ${league} week`, error);
        }
        if (!isCurrent()) return;
        // The week can go out from under a tick: a failed refresh clears the
        // scores. Come round again rather than stop, since the deps no longer
        // hold `games` and nothing would restart this.
        const games = weekGames.current;
        if (games == null) {
          timer = window.setTimeout(tick, POLL_MS);
          return;
        }
        const week = byId(fetched, league);
        const result = week.get(eventId);
        if (result != null) {
          setFound({ games, label, result });
        }
        // Rescheduled from the end of a fetch rather than on an interval, so a slow
        // answer cannot leave two requests running at once. A game with no answer
        // at all is asked about again, since the next week's list may hold it.
        const polledWeek = leagueWeek(games, league, week);
        kickoff = nextKickoff(polledWeek);
        // Runs while any game of the league can still move, not while the watched
        // one can. A rescore reads the whole week, so a poll that stopped at the
        // watched game's final would leave every later column standing until the
        // reader refreshed by hand.
        if (!isWeekOver(polledWeek)) {
          timer = window.setTimeout(tick, POLL_MS);
        }
      };
      await tick();
    });
    return () => {
      stop();
      window.clearTimeout(timer);
    };
  }, [open, label, league, eventId]);

  // Stamped with the game it was fetched for as well as the scoring pass, so an
  // answer that landed for the game before this one is never handed back for it.
  const shown =
    settled ??
    (found != null && found.games === games && found.label === label
      ? found.result
      : undefined);
  return { shown };
}
