import parsePick from "./parsePick";
import { ResultsIndex } from "./resultsIndex";

/**
 * The Monday night game's real total score, which every player's points guess is
 * measured against. Undefined until that game is final.
 */
export default function getTiebreakerScore(
  tiebreakerGameKey: string | undefined,
  firstRow: any,
  college: ResultsIndex,
  pro: ResultsIndex,
): number | undefined {
  // A sheet with no `Pts` column names no tiebreaker game. Nothing to measure a
  // guess against, so the week simply never reads as decided.
  if (tiebreakerGameKey == null) return undefined;
  const { teamAbbreviation: tiebreakerTeam } = parsePick(
    firstRow[tiebreakerGameKey],
  );
  if (tiebreakerTeam == null) return undefined;
  const index = tiebreakerGameKey.startsWith("P") ? pro : college;
  return index.finalByTeam.get(tiebreakerTeam)?.totalScore;
}
