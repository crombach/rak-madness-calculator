import { League } from "../../types/League";
import { LeagueResult } from "../../types/LeagueResult";
import { GameSpread, WeekGame } from "../../types/WeekGame";
import rangeWithPrefix from "../rangeWithPrefix";
import { LEAGUE_PREFIX, LEAGUES, LeagueKey } from "./gameColumns";
import parsePick from "./parsePick";
import { ParsedPicks } from "./parsePicksWorkbook";
import { findMatchup, indexResults, ResultsIndex } from "./resultsIndex";

const ESPN_LEAGUE: Record<LeagueKey, League> = {
  college: League.COLLEGE,
  pro: League.PRO,
};

/**
 * The pool's line on the game, read off the picks and turned around where they wrote
 * it from the underdog's side.
 *
 * The first row that names a team settles it. Every other row describes the same
 * game, from one side or the other, and a sheet whose rows disagree reaches here
 * without its game keys at all, since nothing can tell which of the two was meant.
 */
function gameSpread(
  rows: Array<any>,
  gameKey: string,
  result: LeagueResult,
): GameSpread | undefined {
  for (const row of rows) {
    const { teamAbbreviation, spread } = parsePick(row[gameKey]);
    if (teamAbbreviation == null) continue;
    if (spread === 0) return undefined;
    if (spread < 0) return { team: teamAbbreviation, points: spread };
    const favored = [result.home, result.away]
      .map((side) => side.team.abbreviation)
      .find((abbreviation) => abbreviation !== teamAbbreviation);
    return favored != null ? { team: favored, points: -spread } : undefined;
  }
  return undefined;
}

/**
 * Every game the week's picks describe, in the order the picks table columns are.
 *
 * A column ESPN had no game for keeps its place, so a reader who clicked it is
 * told there is nothing behind it rather than being shown the wrong game.
 *
 * Positional labels rather than the workbook's own keys, because a sheet with two
 * `C1` headers reaches the second column as `C1_1` while the table titles it `C2`.
 * The key is only how the column's teams are looked up.
 */
export default function weekGames(
  parsed: Pick<
    ParsedPicks,
    | "rows"
    | "collegeKeys"
    | "proKeys"
    | "matchupsByGameKey"
    | "inconsistentSpreadGames"
  >,
  results: Record<LeagueKey, Array<LeagueResult>>,
  indexed?: Record<LeagueKey, ResultsIndex>,
): Array<WeekGame> {
  return LEAGUES.flatMap((league) => {
    const index = indexed?.[league] ?? indexResults(results[league]);
    const keys = league === "college" ? parsed.collegeKeys : parsed.proKeys;
    const labels = rangeWithPrefix(keys.length, LEAGUE_PREFIX[league]);
    return keys.map((key, position) => {
      const teams = parsed.matchupsByGameKey.get(key);
      // First match wins, which is how the picks themselves are resolved, so a
      // team playing twice in a college bowl week lands on the same game here.
      const result = teams != null ? findMatchup(index, teams) : undefined;
      return {
        label: labels[position],
        league: ESPN_LEAGUE[league],
        name:
          result?.shortName ??
          (teams != null && teams.size > 0
            ? [...teams].join(" / ")
            : labels[position]),
        result,
        // Read off the game ESPN listed, which is what names the favored side where
        // the picks wrote the line from the other one.
        spread:
          result != null && !parsed.inconsistentSpreadGames.has(key)
            ? gameSpread(parsed.rows, key, result)
            : undefined,
      };
    });
  });
}
