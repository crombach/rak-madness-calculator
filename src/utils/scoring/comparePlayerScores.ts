import { PlayerScore } from "../../types/RakMadnessScores";

/**
 * Everything the tiers read off a player, so a caller holding the numbers without a
 * `PlayerScore` to put them in ranks on these rules rather than a copy of them.
 */
export type Merit = {
  hasNoPicks: boolean;
  hasBlankPick: boolean;
  total: number;
  /** Absent where the player left the Monday night points cell blank. */
  distance?: number;
  college: number;
  proAgainstTheSpread: number;
};

/** Ranks the higher value first. */
function highestFirst(a: number, b: number): number {
  if (a < b) return 1;
  if (a > b) return -1;
  return 0;
}

/** Ranks the lower value first. */
function lowestFirst(a: number, b: number): number {
  return -highestFirst(a, b);
}

function firstAlphabetically(a: string, b: string): number {
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
}

/**
 * Which of two players the pool itself ranks higher, ties left tied.
 *
 * Total score first, then the tiebreakers in order: Monday night points distance,
 * college games picked correctly, then pro games with spreads picked correctly. The
 * route search runs this once per rival per outcome it reads, which is why the tiers
 * are a run of returns rather than a list walked with a call each.
 */
export function compareOnMerit(a: Merit, b: Merit): number {
  // A row the week can't be won by sorts under one that can, so leaders read
  // off row one. No-picks sorts under blank-pick, wider rule checked first.
  if (a.hasNoPicks !== b.hasNoPicks) return a.hasNoPicks ? 1 : -1;
  if (a.hasBlankPick !== b.hasBlankPick) return a.hasBlankPick ? 1 : -1;
  if (a.total !== b.total) return highestFirst(a.total, b.total);
  // A player who left the points cell blank has no distance, so this tier cannot
  // separate them and falls through to the next one.
  if (a.distance != null && b.distance != null && a.distance !== b.distance) {
    return lowestFirst(a.distance, b.distance);
  }
  if (a.college !== b.college) return highestFirst(a.college, b.college);
  return highestFirst(a.proAgainstTheSpread, b.proAgainstTheSpread);
}

export function meritOf(player: PlayerScore): Merit {
  return {
    hasNoPicks: player.status.hasNoPicks,
    hasBlankPick: player.status.hasBlankPick,
    total: player.score.total,
    distance: player.tiebreaker.distance,
    college: player.score.college,
    proAgainstTheSpread: player.score.proAgainstTheSpread,
  };
}

export function comparePlayerScoresOnMerit(
  a: PlayerScore,
  b: PlayerScore,
): number {
  return compareOnMerit(meritOf(a), meritOf(b));
}

/**
 * The row order, which needs every pair separated even where the rules do not
 * separate them. Two players the tiers leave tied have both won the week, so the
 * name is a row order and not a tiebreaker, which is why it lives here rather than
 * in `compareOnMerit`.
 */
export default function comparePlayerScores(
  a: PlayerScore,
  b: PlayerScore,
): number {
  const onMerit = comparePlayerScoresOnMerit(a, b);
  return onMerit !== 0
    ? onMerit
    : firstAlphabetically(a.name.toUpperCase(), b.name.toUpperCase());
}
