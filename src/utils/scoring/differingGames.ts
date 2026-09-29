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

/** The labels of the games every one of `players` picked alike, college first. */
export function sameGames(players: ReadonlyArray<PlayerScore>): Set<string> {
  const [first] = players;
  if (first == null) return new Set();
  const differing = differingGames(players);
  return new Set(
    LEAGUES.flatMap((league) => gameLabels(first, league)).filter(
      (label) => !differing.has(label),
    ),
  );
}

/** The labels of the games any two of `players` picked differently, college first. */
export default function differingGames(
  players: ReadonlyArray<PlayerScore>,
): Set<string> {
  const [first, ...rest] = players;
  if (first == null) return new Set();
  return new Set(
    LEAGUES.flatMap((league) =>
      gameLabels(first, league).filter((_, index) =>
        rest.some(
          (other) =>
            !isSamePick(
              first[league][index].pick,
              other[league][index]?.pick ?? "",
            ),
        ),
      ),
    ),
  );
}
