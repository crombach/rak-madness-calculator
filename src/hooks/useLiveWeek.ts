import { useEffect, useRef, useState } from "react";
import { GameStatus } from "../types/ESPN";
import { League } from "../types/League";
import { LeagueResult } from "../types/LeagueResult";
import { WeekGame } from "../types/WeekGame";
import latestOnly from "../utils/latestOnly";
import { LeagueResults } from "../utils/scoring/leagueResults";

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

/** Every game a fetch answered for, under ESPN's id, which is how the week holds them. */
function byId(results: LeagueResults | undefined): Map<string, LeagueResult> {
  const found = new Map<string, LeagueResult>();
  Object.values(results ?? {}).forEach((league) =>
    league.forEach((result) => {
      found.set(result.id, result);
    }),
  );
  return found;
}

/**
 * The named leagues' games, kept up to date for as long as they are being looked at.
 *
 * The week's scores carry each game as it stood when they were worked out, which is
 * stale the moment a live game moves, so the leagues are fetched again as the view
 * opens and then on `POLL_MS`.
 *
 * `onPoll` is the app's one refresh, told which leagues to fetch. It rescores the
 * week where anything moved, which is how the picks table's column marks and its
 * `.table__cell-wipe` animations catch up without a refresh. It resolves to what it
 * fetched, so a clock and a down that no rescore is owed for still reach the
 * screen.
 *
 * Each league says for itself how long it is polled and what it waits for, since
 * one fetch answers for every game of that league. It drops out once its games are
 * all final, and a tick before the earliest of its kickoffs leaves it out, because
 * nothing that has not started can have moved. A league whose games are all final
 * when the view opens is never fetched at all. The leagues still due on a tick are
 * asked in one call, so one rescore answers for all of them.
 *
 * `restartOn` asks again at once when it changes, rather than on the next tick. The
 * dialog passes the watched game, so moving to another game fetches it straight
 * away.
 *
 * `fetched` is the fresher answer alone, by ESPN's id. Nothing is returned until one
 * lands for the week on screen, and the caller shows the week's own copy of a game
 * meanwhile, so a reader never waits behind a fetch for a game they can already see.
 */
export default function useLiveWeek({
  active,
  leagues,
  games,
  onPoll,
  restartOn,
}: {
  active: boolean;
  leagues: ReadonlyArray<League>;
  games?: Array<WeekGame>;
  onPoll?: (
    leagues: ReadonlyArray<League>,
  ) => Promise<LeagueResults | undefined>;
  restartOn?: string;
}): { fetched?: Map<string, LeagueResult> } {
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
    games: Array<WeekGame>;
    fetched: Map<string, LeagueResult>;
  }>();

  // A string rather than the array, so a caller building the list on each render
  // cannot restart the poll on every render.
  const leagueList = leagues.join();

  useEffect(() => {
    if (!active) return;
    const atStart = weekGames.current;
    if (atStart == null) return;
    const watched = leagueList.split(",").filter(Boolean) as Array<League>;
    // Nothing in these leagues can move again, so there is nothing to poll for. The
    // watched game being over is not enough on its own: the week around it may
    // still be being played, and its columns are what the poll keeps in step.
    let open = watched.filter(
      (league) => !isWeekOver(leagueWeek(atStart, league, new Map())),
    );
    if (open.length === 0) return;
    let timer = 0;
    // Missing until the first fetch answers, so the poll always asks once before it
    // waits on anything. The week's own copy of a kickoff is what the scoring pass
    // read, and a game ESPN has already started is exactly the case the first ask
    // is for.
    const kickoffs = new Map<League, number | null>();
    const stop = latestOnly(async (isCurrent) => {
      const tick = async () => {
        // A league where nothing has kicked off cannot have moved, so the tick
        // leaves it out. Read across the league rather than off the watched game,
        // or a reader sitting on the Sunday night game would hold up the
        // afternoon's rescores all afternoon. The clock is read here on every tick
        // rather than once when the wait is set, so a suspended tab or a changed
        // clock cannot carry the poll more than `POLL_MS` past the kickoff.
        const now = Date.now();
        const due = open.filter((league) => {
          const kickoff = kickoffs.get(league);
          return kickoff == null || now >= kickoff;
        });
        if (due.length === 0) {
          timer = window.setTimeout(tick, POLL_MS);
          return;
        }
        // Undefined where a pass in flight turned this one away, or where the
        // fetch failed. Either way nothing moves on screen and the next tick asks
        // again. A refresh that throws must not take the poll down with it.
        let fetched: LeagueResults | undefined;
        try {
          fetched = await poll.current?.(due);
        } catch (error) {
          console.warn(`Failed to poll the ${due.join(" and ")} week`, error);
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
        const answered = byId(fetched);
        if (answered.size > 0) {
          setFound({ games, fetched: answered });
        }
        // Rescheduled from the end of a fetch rather than on an interval, so a slow
        // answer cannot leave two requests running at once. A game with no answer
        // at all is asked about again, since the next week's list may hold it.
        // Only the leagues just asked are measured again, since a league left out
        // of the tick has no newer answer to be measured against.
        for (const league of due) {
          kickoffs.set(
            league,
            nextKickoff(leagueWeek(games, league, answered)),
          );
        }
        // Runs while any game of a league can still move, not while the watched
        // one can. A rescore reads the whole week, so a poll that stopped at the
        // watched game's final would leave every later column standing until the
        // reader refreshed by hand.
        open = open.filter(
          (league) =>
            !due.includes(league) ||
            !isWeekOver(leagueWeek(games, league, answered)),
        );
        if (open.length > 0) {
          timer = window.setTimeout(tick, POLL_MS);
        }
      };
      await tick();
    });
    return () => {
      stop();
      window.clearTimeout(timer);
    };
  }, [active, leagueList, restartOn]);

  // Stamped with the scoring pass it was fetched against, so an answer that landed
  // for the week before this one is never handed back for it.
  return {
    fetched: found != null && found.games === games ? found.fetched : undefined,
  };
}
