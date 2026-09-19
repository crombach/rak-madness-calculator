import { memo, ReactNode } from "react";
import { useScoreChanges } from "../../../context/AppDataContext";
import { useShowGameStatus } from "../../../context/GameStatusContext";
import { GameStatus } from "../../../types/ESPN";
import {
  PickResult,
  PlayerScore,
  RakMadnessScores,
  Status,
} from "../../../types/RakMadnessScores";
import repeatedNames from "../../../utils/scoring/repeatedNames";
import {
  leagueLabels,
  pickChangeKey,
} from "../../../utils/scoring/gameColumns";
import { fillStatus } from "../../../utils/scoring/getPickResults";
import { PauseCircleIcon } from "../../icon/Icon";
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
 * Keyed by `fillStatus` rather than the scored status, so a cell says what it was
 * drawn as. `incomplete` carries no entry. It draws no color of its own either, so
 * there is nothing sighted that a screen reader needs to catch up on.
 */
const PICK_STATUS_LABEL: Partial<Record<Status, string>> = {
  yes: "Right",
  no: "Wrong",
  unscoreable: "Unscoreable",
};

/**
 * What a column heading wears, for the two states a reader watching the table is
 * waiting on. Every other state is the cells' own fill to say.
 *
 * The same shapes the game dialog's marks use, so a dot and a pause mean the same
 * thing wherever a reader meets them.
 */
const HEADING_MARK: Partial<
  Record<GameStatus, { mark: ReactNode; word: string }>
> = {
  [GameStatus.LIVE]: {
    mark: <span className="table__live-dot" aria-hidden="true" />,
    word: "Live",
  },
  [GameStatus.DELAYED]: {
    mark: (
      <span className="table__delay-icon" aria-hidden="true">
        <PauseCircleIcon />
      </span>
    ),
    word: "Delayed",
  },
};

function leagueHeaders({
  labels,
  statusByLabel,
  onClick,
}: {
  labels: Array<string>;
  /** Where each column's game stands, for the headings a mark is drawn on. */
  statusByLabel: Map<string, GameStatus>;
  onClick: (gameLabel: string) => void;
}) {
  return labels.map((header) => {
    const status = statusByLabel.get(header);
    const heading = status != null ? HEADING_MARK[status] : undefined;
    return (
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
          {/* Before the label, where the dialog's own mark carries its shape. */}
          {heading?.mark}
          {header}
          {/* A column heading is read out again on every cell under it, so this
              reaches a reader on any pick in the game, not just the heading. */}
          {heading != null && (
            <span className="table__sr-only">{heading.word}</span>
          )}
        </button>
      </th>
    );
  });
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
  const statusLabel = PICK_STATUS_LABEL[fillStatus(result)];
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
          className={`table__pick --${fillStatus(result)}`}
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
  const collegeLabels = leagueLabels(collegeCount, "college");
  const proLabels = leagueLabels(proCount, "pro");
  // The label is the one thing a game and the column it was picked in share, and
  // it is what the dialog matches on too. Every game's status is kept, and
  // `HEADING_MARK` is what decides which of them a heading says anything about, so
  // a status ESPN has that this app does not model draws nothing rather than
  // passing for one it does.
  const statusByLabel = new Map(
    (scores.games ?? []).flatMap((game) =>
      game.result != null ? [[game.label, game.result.status] as const] : [],
    ),
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
            statusByLabel,
            onClick: showGameStatus,
          })}
          <th scope="col">College Score</th>
          {leagueHeaders({
            labels: proLabels,
            statusByLabel,
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
