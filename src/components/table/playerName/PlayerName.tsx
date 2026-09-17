import { ReactNode, memo } from "react";
import { useScoreChanges } from "../../../context/AppDataContext";
import { PlayerScore } from "../../../types/RakMadnessScores";
import getClasses from "../../../utils/getClasses";
import { useShowPlayerAnalysis } from "../../../context/PlayerAnalysisContext";
import { useIsMyPlayer } from "../../../context/SettingsContext";
import useShowPlayerStatus from "../../../hooks/useShowPlayerStatus";
import { PLAYER_COL_CLASS } from "../TableShell";
import PlayerStatusIcon from "./PlayerStatusIcon";
import "./PlayerName.scss";

function PlayerName({
  player,
  hasNameConflict,
}: {
  player: PlayerScore;
  /** Whether another row of the week was entered under this same name. */
  hasNameConflict?: boolean;
}) {
  const showPlayerAnalysis = useShowPlayerAnalysis();
  const { players: playerChanges } = useScoreChanges();
  const showStatus = useShowPlayerStatus();
  // A knockout is the one change this cell flashes, so the flash is a way of
  // saying where the player stands and goes wherever the rest of it does. The
  // value is where the player stood before it, which is what the wipe draws.
  const previousKnockedOut = showStatus
    ? playerChanges.get(player.id)
    : undefined;
  const isMine = useIsMyPlayer(player.name);

  // The name, with `icon` beside it. The wipe draws a second one of these under
  // the icon the player held before, so both are built here.
  const nameRow = (icon: ReactNode) => (
    <span className="player-name">
      <span className="player-name__name">{player.name}</span>
      {icon}
    </span>
  );

  // Whose row this is stands apart from where they stand, so it is said either way.
  const name = (
    <>
      {nameRow(
        showStatus && (
          <PlayerStatusIcon
            isKnockedOut={player.status.isKnockedOut}
            hasNameConflict={hasNameConflict}
          />
        ),
      )}
      {isMine && <span className="table__sr-only">Your row</span>}
      {hasNameConflict && (
        <span className="table__sr-only">Name used by another player</span>
      )}
    </>
  );

  return (
    <td
      className={getClasses(PLAYER_COL_CLASS, {
        "--knocked-out": showStatus && player.status.isKnockedOut,
        // Takes the column's own fill and its hit area back off in `Table.scss`,
        // leaving the cell shaped like every other one in the row.
        "--no-status": !showStatus,
        "--mine": isMine,
        // Last, so it stands whichever fill the standing above would have given
        // the cell, and whether or not the reader has the standings turned on.
        "--name-conflict": hasNameConflict === true,
      })}
    >
      {showStatus ? (
        <button
          type="button"
          className="table__cell-button"
          onClick={() => showPlayerAnalysis(player.name)}
        >
          {name}
          <span className="table__sr-only">
            {player.status.isKnockedOut ? "Knocked out" : "Still in contention"}
          </span>
          {previousKnockedOut != null && (
            // Holds the row as it stood, so the wipe uncovers the new icon from
            // under the old one rather than from under a bare fill. A knockout
            // leaves somebody else still standing, whatever it settles, so the
            // icon under the wipe is the one a running week draws.
            <span className="table__cell-wipe" aria-hidden="true">
              {nameRow(
                <PlayerStatusIcon
                  isKnockedOut={previousKnockedOut}
                  hasNameConflict={hasNameConflict}
                  isWinnerDecided={false}
                />,
              )}
            </span>
          )}
        </button>
      ) : (
        name
      )}
    </td>
  );
}

export default memo(PlayerName);
