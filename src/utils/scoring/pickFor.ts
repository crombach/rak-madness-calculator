import { PickResult, PlayerScore } from "../../types/RakMadnessScores";
import { WeekGame } from "../../types/WeekGame";
import gameLabels from "./gameColumns";
import { LEAGUE_KEY } from "./leagueResults";

/** The player's pick on the game, or nothing where the picks hold no cell for it. */
export default function pickFor(
  player: PlayerScore,
  game: WeekGame,
): PickResult | undefined {
  const league = LEAGUE_KEY[game.league];
  const index = gameLabels(player, league).indexOf(game.label);
  return index < 0 ? undefined : player[league][index];
}
