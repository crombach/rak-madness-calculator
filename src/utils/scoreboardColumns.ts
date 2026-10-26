import { PlayerScore } from "../types/RakMadnessScores";

/** Shown where a player's Monday night pick or distance is not known. */
const NOT_AVAILABLE = "N/A";

export type ScoreboardColumn = {
  header: string;
  value: (player: PlayerScore) => number | string;
};

/**
 * The Scoreboard's columns after Rank and Player, in order. The table, its
 * wireframe, and the export's Scoreboard sheet all read this. A column moved
 * here moves in all three.
 */
export const SCOREBOARD_COLUMNS: ReadonlyArray<ScoreboardColumn> = [
  { header: "Total Score", value: (player) => player.score.total },
  {
    header: "MNF Points Pick",
    value: (player) => player.tiebreaker.pick ?? NOT_AVAILABLE,
  },
  {
    header: "MNF Points Distance",
    value: (player) => player.tiebreaker.distance ?? NOT_AVAILABLE,
  },
  { header: "College Score", value: (player) => player.score.college },
  { header: "Pro Score", value: (player) => player.score.pro },
  {
    header: "Pro Score ATS",
    value: (player) => player.score.proAgainstTheSpread,
  },
];
