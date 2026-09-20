import { League } from "../../types/League";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import doNothing from "../../utils/doNothing";
import { LeagueResults } from "../../utils/scoring/leagueResults";
import GameStatusDialog from "./GameStatusDialog";

/**
 * Shared by `GameStatusDialog.test.tsx` and `GameStatusDialogPolling.test.tsx`,
 * which stub the same fetch and open the dialog the same way but cannot share a
 * file. Base UI leaves scroll-lock and focus guards behind a mounted dialog, which
 * puts a second dialog's own search out of reach.
 */
export function dialog(
  gameLabel: string | undefined,
  open: boolean,
  scores: RakMadnessScores,
  onPoll?: (
    leagues: ReadonlyArray<League>,
  ) => Promise<LeagueResults | undefined>,
  fetchingLeagues?: ReadonlySet<League>,
) {
  return (
    <GameStatusDialog
      open={open}
      onOpenChange={doNothing}
      gameLabel={gameLabel}
      scores={scores}
      onPoll={onPoll}
      fetchingLeagues={fetchingLeagues}
    />
  );
}
