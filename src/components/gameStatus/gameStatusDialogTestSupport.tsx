import { MockedFunction } from "vitest";
import { WeekInfo } from "../../types/League";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import doNothing from "../../utils/doNothing";
import { getGameResult } from "../../utils/getLeagueResults";
import GameStatusDialog from "./GameStatusDialog";

/**
 * Shared by `GameStatusDialog.test.tsx` and `GameStatusDialogOnGameFinal.test.tsx`,
 * which mock the same fetch and open the dialog the same way but cannot share a file:
 * Base UI leaves scroll-lock and focus guards behind a mounted dialog, which puts a
 * second dialog's own search out of reach.
 *
 * Each importer must still call `vi.mock("../../utils/getLeagueResults")` itself:
 * that hoists above the importer's own top-level imports, which is what keeps
 * `GameStatusDialog`'s real fetch from loading before the mock is in place. A
 * `vi.mock` call here would only hoist within this file.
 */
export const getGameResultMock = getGameResult as MockedFunction<
  typeof getGameResult
>;

export const WEEK: WeekInfo = {
  value: 5,
  label: "Week 5",
  startDate: new Date("2024-10-01T00:00:00Z"),
  endDate: new Date("2024-10-08T00:00:00Z"),
};
export const SEASON = 2024;

export function dialog(
  gameLabel: string | undefined,
  open: boolean,
  scores: RakMadnessScores,
  onGameFinal?: () => void,
) {
  return (
    <GameStatusDialog
      open={open}
      onOpenChange={doNothing}
      gameLabel={gameLabel}
      scores={scores}
      week={WEEK}
      season={SEASON}
      onGameFinal={onGameFinal}
    />
  );
}
