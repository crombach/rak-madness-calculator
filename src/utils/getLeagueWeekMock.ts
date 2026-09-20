import { MockedFunction } from "vitest";
import { LeagueResult } from "../types/LeagueResult";
import { getLeagueResultsById } from "./getLeagueResults";

/**
 * `getLeagueResultsById`, typed as the mock every test that polls a game asserts
 * against.
 *
 * Each importer must still call `vi.mock` on `./getLeagueResults` itself, at its own
 * path from the importer. That call hoists above the importer's own top-level
 * imports, which is what keeps the real fetch from loading before the mock is in
 * place. A `vi.mock` call here would only hoist within this file.
 */
export const getLeagueWeekMock = getLeagueResultsById as MockedFunction<
  typeof getLeagueResultsById
>;

/**
 * What one poll answers with: the league's whole week, under ESPN's id for each
 * game.
 *
 * Written here rather than in each test, since the poll is given a week and a test
 * is written about the one or two games in it.
 *
 * Throws on two games sharing an id. Every fixture in
 * `scoring/leagueResultFixtures` carries the same placeholder id, so a week built
 * from two of them without spreading a new id onto one would otherwise collapse to
 * a single game and pass whatever it was meant to prove.
 */
export function weekOf(
  ...results: Array<LeagueResult>
): Map<string, LeagueResult> {
  const week = new Map(results.map((result) => [result.id, result]));
  if (week.size !== results.length) {
    throw new Error(
      `weekOf was given ${results.length} games under ${week.size} id(s). Give each one its own id.`,
    );
  }
  return week;
}
