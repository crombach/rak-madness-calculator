import { ReactNode } from "react";
import { GameStatus } from "../../../types/ESPN";
import { WeekGame } from "../../../types/WeekGame";
import { PauseIcon } from "../../icon/Icon";
import "./HeadingMark.scss";

/**
 * What a game's heading wears, for the two states a reader watching the week is
 * waiting on. Every other state is the cells' own fill to say.
 *
 * The same shapes the game dialog's marks use, so a dot and a pause mean the same
 * thing wherever a reader meets them.
 */
export const HEADING_MARK: Partial<
  Record<GameStatus, { mark: ReactNode; word: string }>
> = {
  [GameStatus.LIVE]: {
    mark: <span className="table__live-dot" aria-hidden="true" />,
    word: "Live",
  },
  [GameStatus.DELAYED]: {
    mark: (
      <span className="table__delay-icon" aria-hidden="true">
        <PauseIcon />
      </span>
    ),
    word: "Delayed",
  },
};

/**
 * Every game's status by its label, the one thing a game and the column it was
 * picked in share. `HEADING_MARK` decides which of them a heading says anything
 * about, so a status ESPN has that this app does not model draws nothing rather
 * than passing for one it does.
 */
export function statusByLabel(
  games: Array<WeekGame> = [],
): Map<string, GameStatus> {
  return new Map(
    games.flatMap((game) =>
      game.result != null ? [[game.label, game.result.status] as const] : [],
    ),
  );
}
