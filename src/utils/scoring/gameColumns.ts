import { PlayerScore } from "../../types/RakMadnessScores";
import rangeWithPrefix from "../rangeWithPrefix";

export type LeagueKey = "college" | "pro";

/** `player.id`, then `C1`/`P1` etc, the key a score change is tracked under. */
export function pickChangeKey(playerId: string, gameLabel: string): string {
  return `${playerId}-${gameLabel}`;
}

/** Read in this order wherever a week's games are walked league by league. */
export const LEAGUES: Array<LeagueKey> = ["college", "pro"];

export const LEAGUE_PREFIX: Record<LeagueKey, string> = {
  college: "C",
  pro: "P",
};

/**
 * `C1`, `C2`, `P1`: the column label the picks table gives every game in one
 * league, indexed the way a player's picks for it are.
 */
export default function gameLabels(
  player: PlayerScore,
  league: LeagueKey,
): Array<string> {
  return rangeWithPrefix(player[league].length, LEAGUE_PREFIX[league]);
}
