import { memo } from "react";
import { useScoreChanges } from "../../../context/AppDataContext";
import { useShowGameStatus } from "../../../context/GameStatusContext";
import {
  PickResult,
  PlayerScore,
  RakMadnessScores,
  Status,
} from "../../../types/RakMadnessScores";
import rangeWithPrefix from "../../../utils/rangeWithPrefix";
import {
  LEAGUE_PREFIX,
  pickChangeKey,
} from "../../../utils/scoring/gameColumns";
import PlayerName from "../playerName/PlayerName";
import TableShell, {
  PICK_COL_CLASS,
  PLAYER_COL_CLASS,
  RankCell,
} from "../TableShell";
import "./PicksTable.scss";

/** Rank, player, college score, pro score, and total score. */
const FIXED_COLUMN_COUNT = 5;

/**
 * A pick's status, in words, for the fill color a sighted reader gets instead.
 * `incomplete` carries no entry. It draws no color of its own either, so there is
 * nothing sighted that a screen reader needs to catch up on.
 */
const PICK_STATUS_LABEL: Partial<Record<Status, string>> = {
  yes: "Right",
  no: "Wrong",
  unscoreable: "Unscoreable",
};

function leagueHeaders(labels: Array<string>) {
  return labels.map((header) => (
    // The class is what gives a game's column its width, which the wireframe gives
    // the same column before there is a game in it.
    <th key={header} className={PICK_COL_CLASS} scope="col">
      {header}
    </th>
  ));
}

function PickCell({
  result,
  gameLabel,
  previousStatus,
  onClick,
}: {
  result: PickResult;
  /** The column this cell is in, which is what names the game behind it. */
  gameLabel: string;
  /** Set where this refresh just changed the status, to the status it left. */
  previousStatus?: Status;
  onClick: (gameLabel: string) => void;
}) {
  const statusLabel = PICK_STATUS_LABEL[result.status];
  return (
    <button
      type="button"
      className="table__cell-button"
      onClick={() => onClick(gameLabel)}
    >
      <span>{result.pick || "N/A"}</span>
      {statusLabel && <span className="table__sr-only">{statusLabel}</span>}
      {previousStatus != null && (
        // Keyed by the status arriving, so a cell changed by two refreshes in a
        // row wipes both times rather than sitting on the first run forever.
        <span
          key={result.status}
          className={`table__cell-wipe --${previousStatus}`}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

/** One league's row of pick cells, keyed and labeled by the same column list the header used. */
function PickCells({
  playerName,
  picks,
  labels,
  pickChanges,
  onClick,
}: {
  playerName: string;
  picks: Array<PickResult>;
  labels: Array<string>;
  pickChanges: Map<string, Status>;
  onClick: (gameLabel: string) => void;
}) {
  return (
    <>
      {picks.map((result, index) => (
        <td
          key={pickChangeKey(playerName, labels[index])}
          className={`table__pick --${result.status}`}
        >
          <PickCell
            result={result}
            gameLabel={labels[index]}
            previousStatus={pickChanges.get(
              pickChangeKey(playerName, labels[index]),
            )}
            onClick={onClick}
          />
        </td>
      ))}
    </>
  );
}

function PicksTable({ scores }: { scores?: RakMadnessScores | null }) {
  const showGameStatus = useShowGameStatus();
  const { picks: pickChanges } = useScoreChanges();

  if (scores == null) {
    return null;
  }

  const firstPlayer = scores.scores[0];
  const collegeCount = firstPlayer.college.length;
  const proCount = firstPlayer.pro.length;
  const columnCount = FIXED_COLUMN_COUNT + collegeCount + proCount;
  // Built once for the headers and every row's cells, so a cell and the column it
  // sits under cannot disagree about which game they mean.
  const collegeLabels = rangeWithPrefix(collegeCount, LEAGUE_PREFIX.college);
  const proLabels = rangeWithPrefix(proCount, LEAGUE_PREFIX.pro);

  return (
    <TableShell
      caption="Player picks for the week, college and pro games"
      columnCount={columnCount}
      header={
        <>
          <th scope="col">Rank</th>
          <th className={PLAYER_COL_CLASS} scope="col">
            Player
          </th>
          {leagueHeaders(collegeLabels)}
          <th scope="col">College Score</th>
          {leagueHeaders(proLabels)}
          <th scope="col">Pro Score</th>
          <th scope="col">Total Score</th>
        </>
      }
    >
      {scores.scores.map((player: PlayerScore, index: number) => {
        return (
          <tr key={player.name}>
            <RankCell rank={index + 1} />
            <PlayerName player={player} />
            <PickCells
              playerName={player.name}
              picks={player.college}
              labels={collegeLabels}
              pickChanges={pickChanges}
              onClick={showGameStatus}
            />
            <td>{player.score.college}</td>
            <PickCells
              playerName={player.name}
              picks={player.pro}
              labels={proLabels}
              pickChanges={pickChanges}
              onClick={showGameStatus}
            />
            <td>{player.score.pro}</td>
            <td>
              <b>{player.score.total}</b>
            </td>
          </tr>
        );
      })}
    </TableShell>
  );
}

export default memo(PicksTable);
