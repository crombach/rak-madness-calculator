import { GameStatus } from "../../types/ESPN";
import { LeagueResult } from "../../types/LeagueResult";
import { matchupKey } from "../espnCache";

/**
 * A league's games, looked up the two ways a week asks about them.
 *
 * First match wins in every map. College arrives latest first, so a team playing
 * twice in a bowl week resolves to the later game, and overwriting would silently
 * score that column against the earlier one.
 */
export type ResultsIndex = {
  /** Both sides of every game, by team abbreviation. */
  byTeam: Map<string, LeagueResult>;
  /** The same, holding only the games that have been played. */
  finalByTeam: Map<string, LeagueResult>;
  /** Every game under the key its two sides make. */
  byMatchup: Map<string, LeagueResult>;
};

function keep<T>(map: Map<string, T>, key: string | undefined, value: T): void {
  if (key == null || map.has(key)) return;
  map.set(key, value);
}

/** The key a result would be filed under, or undefined where a side has no name. */
export function resultMatchupKey(result: LeagueResult): string | undefined {
  const home = result.home.team.abbreviation;
  const away = result.away.team.abbreviation;
  if (home == null || away == null) return undefined;
  return matchupKey(new Set([home, away]));
}

export function indexResults(results: Array<LeagueResult>): ResultsIndex {
  const index: ResultsIndex = {
    byTeam: new Map(),
    finalByTeam: new Map(),
    byMatchup: new Map(),
  };
  results.forEach((result) => {
    [result.home.team.abbreviation, result.away.team.abbreviation].forEach(
      (abbreviation) => {
        keep(index.byTeam, abbreviation, result);
        if (result.status === GameStatus.FINAL) {
          keep(index.finalByTeam, abbreviation, result);
        }
      },
    );
    keep(index.byMatchup, resultMatchupKey(result), result);
  });
  return index;
}

/**
 * The one game a picks column describes.
 *
 * A column names two teams once anyone has picked either side of it, and one where
 * every player picked the same team. Both are looked up folded, because a workbook
 * could name a team any way at all while a result carries it already uppercased.
 */
export function findMatchup(
  index: ResultsIndex,
  teams: Set<string>,
): LeagueResult | undefined {
  if (teams.size === 2) return index.byMatchup.get(matchupKey(teams));
  if (teams.size === 1) {
    return index.byTeam.get([...teams][0]?.toUpperCase());
  }
  return undefined;
}
