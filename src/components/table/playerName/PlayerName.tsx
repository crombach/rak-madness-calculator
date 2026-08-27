import { memo } from "react";
import { useScoreChanges } from "../../../context/AppDataContext";
import { PlayerScore } from "../../../types/RakMadnessScores";
import getClasses from "../../../utils/getClasses";
import { useShowPlayerAnalysis } from "../../../context/PlayerAnalysisContext";
import { useIsMyPlayer } from "../../../context/SettingsContext";
import { PLAYER_COL_CLASS } from "../TableShell";
import PlayerStatusIcon from "./PlayerStatusIcon";
import "./PlayerName.scss";

function PlayerName({ player }: { player: PlayerScore }) {
  const showPlayerAnalysis = useShowPlayerAnalysis();
  const { players: playerChanges } = useScoreChanges();
  const justKnockedOut = playerChanges.has(player.name);
  const isMine = useIsMyPlayer(player.name);

  return (
    <td
      className={getClasses(PLAYER_COL_CLASS, {
        "--knocked-out": player.status.isKnockedOut,
        "--mine": isMine,
      })}
    >
      <button
        type="button"
        className="table__cell-button"
        onClick={() => showPlayerAnalysis(player.name)}
      >
        <span className="player-name">
          <span className="player-name__name">{player.name}</span>
          <PlayerStatusIcon isKnockedOut={player.status.isKnockedOut} />
        </span>
        {isMine && <span className="table__sr-only">Your row</span>}
        <span className="table__sr-only">
          {player.status.isKnockedOut ? "Knocked out" : "Still in contention"}
        </span>
        {justKnockedOut && (
          <span className="table__cell-wipe" aria-hidden="true" />
        )}
      </button>
    </td>
  );
}

export default memo(PlayerName);
