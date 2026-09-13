import { memo } from "react";
import { useScoreChanges } from "../../../context/AppDataContext";
import { useShowGameStatus } from "../../../context/GameStatusContext";
import { GameStatus } from "../../../types/ESPN";
import {
  PickResult,
  PlayerScore,
  RakMadnessScores,
  Status,
} from "../../../types/RakMadnessScores";
import rangeWithPrefix from "../../../utils/rangeWithPrefix";
import repeatedNames from "../../../utils/scoring/repeatedNames";
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

function leagueHeaders({
  labels,
  liveLabels,
  onClick,
}: {
  labels: Array<string>;
  liveLabels: Set<string>;
  onClick: (gameLabel: string) => void;
}) {
  return labels.map((header) => (
    // The class is what gives a game's column its width, which the wireframe gives
    // the same column before there is a game in it.
    <th key={header} className={PICK_COL_CLASS} scope="col">
      {/* Opens the same game every cell under this heading opens, which is the
          one row of the column a reader with no pick of their own can reach. */}
      <button
        type="button"
        className="table__cell-button"
        onClick={() => onClick(header)}
      >
        {/* Before the label, where the dialog's own live mark carries its dot. */}
        {liveLabels.has(header) && (
          <span className="table__live-dot" aria-hidden="true" />
        )}
        {header}
        {/* A column heading is read out again on every cell under it, so this
            reaches a reader on any pick in the game, not just the heading. */}
        {liveLabels.has(header) && <span className="table__sr-only">Live</span>}
      </button>
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
  playerId,
  picks,
  labels,
  pickChanges,
  onClick,
}: {
  /** The row these cells belong to, which two players can share a name in. */
  playerId: string;
  picks: Array<PickResult>;
  labels: Array<string>;
  pickChanges: Map<string, Status>;
  onClick: (gameLabel: string) => void;
}) {
  return (
    <>
      {picks.map((result, index) => (
        <td
          key={pickChangeKey(playerId, labels[index])}
          className={`table__pick --${result.status}`}
        >
          <PickCell
            result={result}
            gameLabel={labels[index]}
            previousStatus={pickChanges.get(
              pickChangeKey(playerId, labels[index]),
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

  // Marked wherever a name shows, since a name two rows share reads as one player
  // and the analysis behind it cannot answer for either.
  const repeated = repeatedNames(scores.scores);
  const firstPlayer = scores.scores[0];
  const collegeCount = firstPlayer.college.length;
  const proCount = firstPlayer.pro.length;
  const columnCount = FIXED_COLUMN_COUNT + collegeCount + proCount;
  // Built once for the headers and every row's cells, so a cell and the column it
  // sits under cannot disagree about which game they mean.
  const collegeLabels = rangeWithPrefix(collegeCount, LEAGUE_PREFIX.college);
  const proLabels = rangeWithPrefix(proCount, LEAGUE_PREFIX.pro);
  // The label is the one thing a game and the column it was picked in share, and
  // it is what the dialog matches on too. Tested against `LIVE` rather than away
  // from `FINAL`, because the statuses ESPN has that this app does not model,
  // postponed among them, fall straight through the enum.
  const liveLabels = new Set(
    (scores.games ?? [])
      .filter((game) => game.result?.status === GameStatus.LIVE)
      .map((game) => game.label),
  );

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
          {leagueHeaders({
            labels: collegeLabels,
            liveLabels,
            onClick: showGameStatus,
          })}
          <th scope="col">College Score</th>
          {leagueHeaders({
            labels: proLabels,
            liveLabels,
            onClick: showGameStatus,
          })}
          <th scope="col">Pro Score</th>
          <th scope="col">Total Score</th>
        </>
      }
    >
      {scores.scores.map((player: PlayerScore, index: number) => {
        return (
          <tr key={player.id}>
            <RankCell rank={index + 1} />
            <PlayerName
              player={player}
              hasNameConflict={repeated.has(player.name)}
            />
            <PickCells
              playerId={player.id}
              picks={player.college}
              labels={collegeLabels}
              pickChanges={pickChanges}
              onClick={showGameStatus}
            />
            <td>{player.score.college}</td>
            <PickCells
              playerId={player.id}
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
