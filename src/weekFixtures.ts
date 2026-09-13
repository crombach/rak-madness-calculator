import { WeekInfo } from "./types/League";
import { PlayerScore } from "./types/RakMadnessScores";

/**
 * Fixture builders every suite uses.
 *
 * Held apart from `appTestFixtures`, which mounts `App` and so cannot be imported
 * by a suite that mocks `react-router` or a context provider out from under it.
 */

/** The year the fixture season started in, which is what its dates say. */
export const SEASON = 2024;

export function week(value: number): WeekInfo {
  return {
    value,
    label: `Week ${value}`,
    startDate: new Date(SEASON, 8, value),
    endDate: new Date(SEASON, 8, value + 6),
  };
}

/**
 * A row of the workbook for every call, which is what `scorePlayers` mints an `id`
 * from. Taken off the name instead, two rows sharing a name would share an id, and a
 * test of that case would reproduce the bug the id exists to fix rather than catch it.
 */
let nextRow = 0;

export function playerScore(over: Partial<PlayerScore> = {}): PlayerScore {
  return {
    id: String(nextRow++),
    name: "Alice",
    score: { total: 3, college: 1, pro: 2, proAgainstTheSpread: 1 },
    tiebreaker: { pick: 41, distance: 0 },
    college: [],
    pro: [],
    status: { hasNoPicks: false, hasBlankPick: false, isKnockedOut: false },
    ...over,
  };
}
