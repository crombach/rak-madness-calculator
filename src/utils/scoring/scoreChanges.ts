import {
  PlayerScore,
  RakMadnessScores,
  Status,
} from "../../types/RakMadnessScores";
import gameLabels, { LEAGUES, pickChangeKey } from "./gameColumns";

/**
 * What a refresh changed, so a table can flash only the cells that moved rather
 * than every cell a new `RakMadnessScores` touches.
 */
export type ScoreChanges = {
  /** `player.id` to whether they were still in contention before. */
  players: Map<string, boolean>;
  /** `pickChangeKey(player.id, gameLabel)` to the status the cell held before. */
  picks: Map<string, Status>;
};

export const NO_SCORE_CHANGES: ScoreChanges = {
  players: new Map(),
  picks: new Map(),
};

/**
 * `previous` and `current` for the same week, or `undefined` where there is
 * nothing to compare against, which is every week's first score.
 */
export default function scoreChanges(
  previous: RakMadnessScores | undefined,
  current: RakMadnessScores,
): ScoreChanges {
  if (previous == null) return NO_SCORE_CHANGES;

  const players = new Map<string, boolean>();
  const picks = new Map<string, Status>();
  // By row rather than by name. Two players have entered this pool under one name,
  // and diffing those two rows against each other marks cells that never moved.
  const before = new Map<string, PlayerScore>(
    previous.scores.map((player) => [player.id, player]),
  );

  current.scores.forEach((player) => {
    const was = before.get(player.id);
    if (was == null) return;

    if (!was.status.isKnockedOut && player.status.isKnockedOut) {
      players.set(player.id, was.status.isKnockedOut);
    }

    LEAGUES.forEach((league) => {
      const labels = gameLabels(was, league);
      was[league].forEach((result, index) => {
        const after = player[league][index];
        if (after != null && after.status !== result.status) {
          picks.set(pickChangeKey(player.id, labels[index]), result.status);
        }
      });
    });
  });

  return { players, picks };
}
