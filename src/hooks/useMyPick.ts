import { isMyPlayer, useSettingsSelector } from "../context/SettingsContext";
import { RakMadnessScores } from "../types/RakMadnessScores";
import { WeekGame } from "../types/WeekGame";
import pickFor from "../utils/scoring/pickFor";

/**
 * The reader's own pick on the game, as the cell reads.
 *
 * Nothing where no name is set, no player goes by it, or the cell is blank.
 */
export default function useMyPick(
  scores: RakMadnessScores | undefined,
  game: WeekGame | undefined,
): string | undefined {
  return useSettingsSelector(({ playerName }) => {
    if (game == null) return undefined;
    const player = scores?.scores.find(({ name }) =>
      isMyPlayer(name, playerName),
    );
    const pick =
      player != null ? pickFor(player, game)?.pick.trim() : undefined;
    return pick || undefined;
  });
}
