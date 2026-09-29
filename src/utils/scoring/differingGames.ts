import { PlayerScore } from "../../types/RakMadnessScores";
import gameLabels, { LEAGUES } from "./gameColumns";
import parsePick from "./parsePick";

/** Whether two hand-typed cells name the same team and spread. */
function isSamePick(a: string, b: string): boolean {
  const first = parsePick(a);
  const second = parsePick(b);
  return (
    first.teamAbbreviation === second.teamAbbreviation &&
    first.spread === second.spread
  );
}

/** The labels of the games two players picked differently, college first. */
export default function differingGames(
  first: PlayerScore,
  second: PlayerScore,
): Set<string> {
  return new Set(
    LEAGUES.flatMap((league) =>
      gameLabels(first, league).filter(
        (_, index) =>
          !isSamePick(
            first[league][index].pick,
            second[league][index]?.pick ?? "",
          ),
      ),
    ),
  );
}
