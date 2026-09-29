import { PlayerScore } from "../../types/RakMadnessScores";
import differingGames from "./differingGames";
import { pickDifference } from "./remainingGames";
import weekShape from "./weekShape";

export type Matchup = {
  /** The player ahead on points, or the first player when level. */
  leader: PlayerScore;
  trailer: PlayerScore;
  /** How many points `leader` is ahead by. */
  gap: number;
  /** The split games still to be played, by label. */
  open: Set<string>;
  /** The split games already scored, by label. */
  decided: Set<string>;
  /** How `trailer` can still finish on points against `leader`. */
  verdict: Verdict;
};

export type Verdict =
  /** The fewest open games that must go `trailer`'s way to pass `leader`. */
  | { kind: "pass"; needed: number }
  /** Every open game going `trailer`'s way ends level, for the tiebreakers. */
  | { kind: "level" }
  | { kind: "out" };

/**
 * How far one open game moves the gap when it goes the trailer's way rather than
 * the leader's. A game both can score on swings a point each way, so it counts
 * twice. A game only one of them can score on counts once. A game neither can
 * separate them on, such as one split only by the spread on the same team,
 * counts for nothing here.
 */
function swing(
  game: Parameters<typeof pickDifference>[0],
  trailerIndex: number,
  leaderIndex: number,
): { weight: number; leaderGain: number } {
  const trailerSide = pickDifference(game, trailerIndex, leaderIndex);
  const leaderSide = pickDifference(game, leaderIndex, trailerIndex);
  if (trailerSide === "opposed") return { weight: 2, leaderGain: 1 };
  if (trailerSide === "playerOnly") return { weight: 1, leaderGain: 0 };
  if (leaderSide === "playerOnly") return { weight: 1, leaderGain: 1 };
  return { weight: 0, leaderGain: 0 };
}

/** Where two players of the week stand against each other, on points alone. */
export default function getHeadToHead(
  players: Array<PlayerScore>,
  first: PlayerScore,
  second: PlayerScore,
): Matchup {
  const [leader, trailer] =
    second.score.total > first.score.total ? [second, first] : [first, second];
  const gap = leader.score.total - trailer.score.total;
  const split = differingGames([first, second]);
  const remaining = weekShape(players).remaining.filter((game) =>
    split.has(game.label),
  );
  const open = new Set(remaining.map((game) => game.label));
  const decided = new Set([...split].filter((label) => !open.has(label)));

  const leaderIndex = players.indexOf(leader);
  const trailerIndex = players.indexOf(trailer);
  const swings = remaining.map((game) =>
    swing(game, trailerIndex, leaderIndex),
  );
  // The gap left if every open game goes the leader's way. Each game that goes the
  // trailer's way instead takes its weight off it.
  const worst = swings.reduce(
    (total, { leaderGain }) => total + leaderGain,
    gap,
  );
  const weights = swings.map(({ weight }) => weight).sort((a, b) => b - a);
  const best = weights.reduce((total, weight) => total - weight, worst);

  let verdict: Verdict = { kind: "out" };
  if (best < 0) {
    let left = worst;
    let needed = 0;
    while (left >= 0) left -= weights[needed++];
    verdict = { kind: "pass", needed };
  } else if (best === 0) {
    verdict = { kind: "level" };
  }
  return { leader, trailer, gap, open, decided, verdict };
}
