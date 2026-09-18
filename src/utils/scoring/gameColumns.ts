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

/** `C1`, `C2`, `P1`: the column label the picks table gives a league's games. */
export function leagueLabels(count: number, league: LeagueKey): Array<string> {
  return rangeWithPrefix(count, LEAGUE_PREFIX[league]);
}

/** The same labels, indexed the way one player's picks for the league are. */
export default function gameLabels(
  player: PlayerScore,
  league: LeagueKey,
): Array<string> {
  return leagueLabels(player[league].length, league);
}
