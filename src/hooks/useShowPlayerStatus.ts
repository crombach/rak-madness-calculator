import { useIsWinnerDecided } from "../context/AppDataContext";
import { useSettings } from "../context/SettingsContext";

/**
 * Whether the tables may say where a player stands, and open the analysis saying
 * why.
 *
 * A decided week is history, and history is told however the reader has set this:
 * the setting only covers a week whose games are still being played. One hook
 * rather than the same pair of reads in each place, so a name cell and the fill
 * behind it cannot disagree about which of the two it is.
 */
export default function useShowPlayerStatus(): boolean {
  const isWinnerDecided = useIsWinnerDecided();
  const { liveAnalysis } = useSettings();
  return isWinnerDecided || liveAnalysis;
}
