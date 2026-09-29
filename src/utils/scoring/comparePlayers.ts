import { PlayerScore } from "../../types/RakMadnessScores";
import differingGames from "./differingGames";
import getHeadToHead, { Matchup } from "./headToHead";
import weekShape from "./weekShape";

export type Comparison = {
  /** Every chosen player on the most points, in the order they were chosen. */
  leaders: Array<PlayerScore>;
  /** Each chosen player but the first leader, against that leader. */
  matchups: Array<Matchup>;
  /** The games any two chosen players split, still to be played, by label. */
  open: Set<string>;
  /** The games any two chosen players split, already scored, by label. */
  decided: Set<string>;
};

/** Where two or more players of the week stand against the one ahead on points. */
export default function getComparison(
  players: Array<PlayerScore>,
  chosen: Array<PlayerScore>,
): Comparison {
  const top = Math.max(...chosen.map((player) => player.score.total));
  const leaders = chosen.filter((player) => player.score.total === top);
  const [leader] = leaders;
  const matchups = chosen
    .filter((player) => player !== leader)
    .map((player) => getHeadToHead(players, leader, player));

  const split = differingGames(chosen);
  const open = new Set(
    weekShape(players)
      .remaining.map((game) => game.label)
      .filter((label) => split.has(label)),
  );
  const decided = new Set([...split].filter((label) => !open.has(label)));
  return { leaders, matchups, open, decided };
}
