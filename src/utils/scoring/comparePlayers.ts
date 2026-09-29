import { PlayerScore } from "../../types/RakMadnessScores";
import differingGames from "./differingGames";
import weekShape from "./weekShape";

export type Comparison = {
  /** The games any two chosen players split, still to be played, by label. */
  open: Set<string>;
  /** The games any two chosen players split, already scored, by label. */
  decided: Set<string>;
};

/** The games two or more players of the week picked differently, open or decided. */
export default function getComparison(
  players: Array<PlayerScore>,
  chosen: Array<PlayerScore>,
): Comparison {
  const split = differingGames(chosen);
  const open = new Set(
    weekShape(players)
      .remaining.map((game) => game.label)
      .filter((label) => split.has(label)),
  );
  const decided = new Set([...split].filter((label) => !open.has(label)));
  return { open, decided };
}
