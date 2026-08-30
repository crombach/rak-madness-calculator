import { memo } from "react";
import { useScoreChanges } from "../../../context/AppDataContext";
import { PlayerScore } from "../../../types/RakMadnessScores";
import getClasses from "../../../utils/getClasses";
import { useShowPlayerAnalysis } from "../../../context/PlayerAnalysisContext";
import { useIsMyPlayer } from "../../../context/SettingsContext";
import useShowPlayerStatus from "../../../hooks/useShowPlayerStatus";
import { PLAYER_COL_CLASS } from "../TableShell";
import PlayerStatusIcon from "./PlayerStatusIcon";
import "./PlayerName.scss";

function PlayerName({ player }: { player: PlayerScore }) {
  const showPlayerAnalysis = useShowPlayerAnalysis();
  const { players: playerChanges } = useScoreChanges();
  const showStatus = useShowPlayerStatus();
  // A knockout is the one change this cell flashes, so the flash is a way of
  // saying where the player stands and goes wherever the rest of it does.
  const justKnockedOut = showStatus && playerChanges.has(player.name);
  const isMine = useIsMyPlayer(player.name);

  // Whose row this is stands apart from where they stand, so it is said either way.
  const name = (
    <>
      <span className="player-name">
        <span className="player-name__name">{player.name}</span>
        {showStatus && (
          <PlayerStatusIcon isKnockedOut={player.status.isKnockedOut} />
        )}
      </span>
      {isMine && <span className="table__sr-only">Your row</span>}
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
          {justKnockedOut && (
            <span className="table__cell-wipe" aria-hidden="true" />
          )}
        </button>
      ) : (
        name
      )}
    </td>
  );
}

export default memo(PlayerName);
