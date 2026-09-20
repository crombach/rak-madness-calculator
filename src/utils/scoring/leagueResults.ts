import { League, WeekInfo } from "../../types/League";
import { LeagueResult } from "../../types/LeagueResult";
import { getLeagueResults } from "../getLeagueResults";
import { LEAGUES, LeagueKey } from "./gameColumns";

/** Both leagues' games for one week, which is what a scoring pass runs on. */
export type LeagueResults = Record<LeagueKey, Array<LeagueResult>>;

export const ESPN_LEAGUE: Record<LeagueKey, League> = {
  college: League.COLLEGE,
  pro: League.PRO,
};

export const LEAGUE_KEY: Record<League, LeagueKey> = {
  [League.COLLEGE]: "college",
  [League.PRO]: "pro",
};

/**
 * Everything the week draws off a game: the mark on its column heading, and the
 * score every pick under that heading is scored against.
 *
 * Compared as one string rather than field by field, since a move in any of them
 * costs the week the same rescore. The clock, the down and ESPN's own wording are
 * left out on purpose. They move on nearly every poll and change no column and no
 * score, so counting them would rescore the week every twenty seconds.
 */
function gameState(result: LeagueResult): string {
  return `${result.status}:${result.home.score}-${result.away.score}`;
}

/**
 * The week's games, with the named leagues fetched and every other league taken
 * from `held`.
 *
 * One scoreboard is a whole league's week, so a reader watching one game is a
 * reason to fetch that league and no reason at all to fetch the other. A league
 * named here is always fetched, and so is a league `held` has nothing for, which
 * is what stops a week switch being served the week before it.
 */
export async function fetchLeagueResults({
  leagues,
  week,
  season,
  matchups,
  held,
}: {
  leagues: ReadonlyArray<LeagueKey>;
  week: WeekInfo;
  season?: number;
  matchups: Record<LeagueKey, Array<Set<string>>>;
  held?: LeagueResults;
}): Promise<LeagueResults> {
  const fetched = await Promise.all(
    LEAGUES.map(async (league): Promise<[LeagueKey, Array<LeagueResult>]> => {
      const kept = held?.[league];
      if (kept != null && !leagues.includes(league)) {
        return [league, kept];
      }
      return [
        league,
        await getLeagueResults(
          ESPN_LEAGUE[league],
          week,
          matchups[league],
          season,
        ),
      ];
    }),
  );
  return Object.fromEntries(fetched) as LeagueResults;
}

/**
 * Whether any game of the named leagues sits somewhere `before` does not have it.
 *
 * Measured over the whole league rather than one game, because one scoreboard
 * answers for every column of that league and each of them wears a mark of its
 * own. A league with nothing held is read as moved, since there is no answer to
 * call it unchanged against.
 */
export function hasMoved(
  leagues: ReadonlyArray<LeagueKey>,
  before: LeagueResults | undefined,
  after: LeagueResults,
): boolean {
  if (before == null) return true;
  return leagues.some((league) => {
    const was = new Map(
      before[league].map((result) => [result.id, gameState(result)]),
    );
    return after[league].some(
      (result) => was.get(result.id) !== gameState(result),
    );
  });
}
