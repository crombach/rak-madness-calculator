// What ESPN has said that it cannot say differently later, kept in this browser so it
// is not asked again. A game that has been played keeps its score, a matchup ESPN
// never listed keeps being a hole, and a season that is over keeps its schedule.
//
// Nothing about the pool is cached, only ESPN's side of it: a spread the workbook
// contradicts itself on, and a cell nobody filled in, are worked out from the picks
// every time, and they cost no request.
//
// Games are filed under the matchup the picks name, so a week whose matchups change
// finds nothing for the ones that moved and asks about those again.

import { GameStatus } from "../types/ESPN";
import { League } from "../types/League";
import { LeagueResult } from "../types/LeagueResult";
import localStorageCache, { LocalStorageCache } from "./localStorageCache";

/** A week of both leagues is tens of KB. */
const MAX_CACHED_WEEKS = 6;
/** Bumped where a stored shape changes, which makes every older entry a miss. */
const VERSION = 2;

/** A game as it was stored, whose date has been through JSON and is text again. */
type StoredGame = (Omit<LeagueResult, "date"> & { date: string }) | null;

/** Keyed by matchup. Null is a matchup ESPN listed no game for. */
type StoredGames = Record<string, StoredGame>;

type Versioned<T> = { version: number; value: T };

/** A game ESPN has finished with, or null for a matchup it never listed. */
export type CachedGame = LeagueResult | null;

/** Unwraps a `Versioned` cache to one that reads a miss for any other version. */
function versioned<T>(
  cache: LocalStorageCache<Versioned<T>>,
): LocalStorageCache<T> {
  return {
    read: (name) => {
      const stored = cache.read(name);
      return stored?.version === VERSION ? stored.value : undefined;
    },
    write: (name, value) => cache.write(name, { version: VERSION, value }),
  };
}

const results = versioned(
  localStorageCache<Versioned<StoredGames>>({
    prefix: "rak-madness:espn:results:",
    cap: MAX_CACHED_WEEKS,
    label: "ESPN results",
    encode: (value) => JSON.stringify(value),
    decode: (text) => JSON.parse(text),
  }),
);

const calendars = versioned(
  localStorageCache<Versioned<unknown>>({
    prefix: "rak-madness:espn:calendar:",
    cap: MAX_CACHED_WEEKS,
    label: "ESPN calendar",
    encode: (value) => JSON.stringify(value),
    decode: (text) => JSON.parse(text),
  }),
);

/**
 * What a matchup is filed under.
 *
 * Folded and sorted, because the workbook could name the same two teams either way
 * around and in any case at all, while a result carries them already uppercased. A
 * column names one team where every player picked the same side, which is a matchup in
 * its own right.
 */
export function matchupKey(teams: Set<string>): string {
  return [...teams]
    .map((team) => team.toUpperCase())
    .sort()
    .join("|");
}

/** The games this browser has stored for a week, keyed by matchup. */
export function readCachedResults(
  season: number,
  week: number,
  league: League,
): Record<string, CachedGame> {
  const stored = results.read(`${season}:${week}:${league}`);
  // An entry of the version in hand can still be nonsense, since anything at all can
  // be written to storage this shares with the rest of the origin.
  if (typeof stored !== "object") {
    return {};
  }
  const games: Record<string, CachedGame> = {};
  Object.entries(stored ?? {}).forEach(([key, game]) => {
    games[key] = game == null ? null : { ...game, date: new Date(game.date) };
  });
  return games;
}

/**
 * Keeps a week's finished games and its holes, dropping whatever it held before.
 *
 * The whole week goes in at once, so a matchup the picks no longer name is not left
 * behind to be answered with.
 */
export function writeCachedResults(
  season: number,
  week: number,
  league: League,
  games: Record<string, CachedGame>,
): void {
  const stored: StoredGames = {};
  Object.entries(games).forEach(([key, game]) => {
    stored[key] =
      game == null ? null : { ...game, date: game.date.toISOString() };
  });
  results.write(`${season}:${week}:${league}`, stored);
}

/** Whether an answer is one this browser can hold on to for good. */
export function isSettled(game: CachedGame): boolean {
  return game == null || game.status === GameStatus.FINAL;
}

/**
 * A season's calendar as ESPN sent it, or undefined where this browser has none.
 *
 * Held as the response rather than as what the response was read as, so the reading
 * of it stays in one place and a stored date needs no bringing back to life.
 */
export function readCachedCalendar<T>(
  league: League,
  season: number,
): T | undefined {
  return calendars.read(`${league}:${season}`) as T | undefined;
}

export function writeCachedCalendar(
  league: League,
  season: number,
  scoreboard: unknown,
): void {
  calendars.write(`${league}:${season}`, scoreboard);
}
