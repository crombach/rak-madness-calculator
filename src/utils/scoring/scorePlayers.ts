import { GameScore } from "../../types/GameScore";
import { LeagueResult } from "../../types/LeagueResult";
import { PlayerScore } from "../../types/RakMadnessScores";
import comparePlayerScores from "./comparePlayerScores";
import { getPickResults, getStatus } from "./getPickResults";
import { formatPickDisplay } from "./parsePick";
import { ParsedPicks, TIEBREAKER_PICK_KEY } from "./parsePicksWorkbook";
import { indexResults, ResultsIndex } from "./resultsIndex";

function sumPointValues(scores: Array<GameScore>): number {
  return scores.reduce((sum, score) => sum + score.pointValue, 0);
}

/** Restates the flagged games as positions, which is how a row's picks arrive. */
function byPickIndex(
  gameKeys: Array<string>,
  reasonByGameKey: Map<string, string>,
): Map<number, string> {
  const byIndex = new Map<number, string>();
  gameKeys.forEach((gameKey, index) => {
    const reason = reasonByGameKey.get(gameKey);
    if (reason != null) {
      byIndex.set(index, reason);
    }
  });
  return byIndex;
}

/** Scores every row in the workbook, highest first. */
export default function scorePlayers(
  parsed: ParsedPicks,
  results: { college: Array<LeagueResult>; pro: Array<LeagueResult> },
  tiebreakerScore?: number,
  indexed?: { college: ResultsIndex; pro: ResultsIndex },
): Array<PlayerScore> {
  const collegeResultsByTeam = (
    indexed?.college ?? indexResults(results.college)
  ).byTeam;
  const proResultsByTeam = (indexed?.pro ?? indexResults(results.pro)).byTeam;
  const unscoreableCollege = byPickIndex(
    parsed.collegeKeys,
    parsed.inconsistentSpreadGames,
  );
  const unscoreablePro = byPickIndex(
    parsed.proKeys,
    parsed.inconsistentSpreadGames,
  );

  const scores: Array<PlayerScore> = parsed.rows.map((playerRow: any) => {
    const collegePicks = parsed.collegeKeys.map((key) => playerRow[key]);
    const proPicks = parsed.proKeys.map((key) => playerRow[key]);
    const hasNoPicks =
      !collegePicks.some((it) => it != null) &&
      !proPicks.some((it) => it != null);

    const collegePickResults = getPickResults(
      collegePicks,
      collegeResultsByTeam,
      unscoreableCollege,
    );
    const scoreCollege = sumPointValues(
      collegePickResults.filter((result) => result.isCompleted),
    );

    const proPickResults = getPickResults(
      proPicks,
      proResultsByTeam,
      unscoreablePro,
    );
    const proPickResultsCompleted = proPickResults.filter(
      (result) => result.isCompleted,
    );
    const scorePro = sumPointValues(proPickResultsCompleted);
    const scoreProAgainstTheSpread = sumPointValues(
      proPickResultsCompleted.filter((score) => score.hasSpread),
    );

    const tiebreakerPick = playerRow[TIEBREAKER_PICK_KEY];
    return {
      name: playerRow.Name,
      score: {
        total: scoreCollege + scorePro,
        college: scoreCollege,
        pro: scorePro,
        proAgainstTheSpread: scoreProAgainstTheSpread,
      },
      tiebreaker: {
        pick: tiebreakerPick,
        distance:
          tiebreakerPick != null && tiebreakerScore != null
            ? Math.abs(tiebreakerPick - tiebreakerScore)
            : undefined,
      },
      college: collegePicks.map((pick, index) => ({
        pick: formatPickDisplay(pick),
        status: getStatus(collegePickResults[index]),
        explanation: collegePickResults[index].explanation,
      })),
      pro: proPicks.map((pick, index) => ({
        pick: formatPickDisplay(pick),
        status: getStatus(proPickResults[index]),
        explanation: proPickResults[index].explanation,
      })),
      status: {
        isKnockedOut: hasNoPicks,
        hasNoPicks,
      },
    };
  });

  return scores.sort(comparePlayerScores);
}
