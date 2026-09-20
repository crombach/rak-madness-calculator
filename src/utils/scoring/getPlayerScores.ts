import { WeekInfo } from "../../types/League";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import debugLog from "../debugLog";
import applyKnockouts from "./applyKnockouts";
import { LEAGUES } from "./gameColumns";
import getTiebreakerScore from "./getTiebreakerScore";
import { fetchLeagueResults, LeagueResults } from "./leagueResults";
import parsePicksWorkbook from "./parsePicksWorkbook";
import { indexResults } from "./resultsIndex";
import scorePlayers from "./scorePlayers";
import weekGames from "./weekGames";

/**
 * A week scored, from the picks and the games they name.
 *
 * `results` is the week ESPN has, for a caller that has already fetched it. A
 * refresh that fetched one league and kept the other hands both in here, so the
 * league it kept is not asked about twice. Left out, both leagues are fetched.
 */
export async function getPlayerScores(
  week: WeekInfo,
  picksBuffer: ArrayBuffer,
  season?: number,
  results?: LeagueResults,
): Promise<RakMadnessScores> {
  const parsed = await parsePicksWorkbook(picksBuffer);

  const fetched =
    results ??
    (await fetchLeagueResults({
      leagues: LEAGUES,
      week,
      season,
      matchups: { college: parsed.collegeMatchups, pro: parsed.proMatchups },
    }));
  debugLog("league results", fetched);

  // Built once for the pass. Every row resolves its picks against the same games,
  // and so do the tiebreaker and the week's game list.
  const indexed = {
    college: indexResults(fetched.college),
    pro: indexResults(fetched.pro),
  };

  const tiebreakerScore = getTiebreakerScore(
    parsed.tiebreakerGameKey,
    parsed.rows[0],
    indexed.college,
    indexed.pro,
  );

  const sortedScores = scorePlayers(parsed, fetched, tiebreakerScore, indexed);

  return {
    tiebreaker: tiebreakerScore,
    scores: applyKnockouts(sortedScores, tiebreakerScore),
    games: weekGames(parsed, fetched, indexed),
  };
}
