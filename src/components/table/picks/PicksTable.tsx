import { PointerEvent, memo, useLayoutEffect, useRef } from "react";
import { useScoreChanges } from "../../../context/AppDataContext";
import { useShowGameStatus } from "../../../context/GameStatusContext";
import { GameStatus } from "../../../types/ESPN";
import {
  PickResult,
  PlayerScore,
  RakMadnessScores,
  Status,
} from "../../../types/RakMadnessScores";
import getClasses from "../../../utils/getClasses";
import repeatedNames from "../../../utils/scoring/repeatedNames";
import {
  leagueLabels,
  pickChangeKey,
} from "../../../utils/scoring/gameColumns";
import { fillStatus } from "../../../utils/scoring/getPickResults";
import PlayerName from "../playerName/PlayerName";
import TableShell, {
  PICK_COL_CLASS,
  PLAYER_COL_CLASS,
  RankCell,
} from "../TableShell";
import { HEADING_MARK, statusByLabel } from "./headingMark";
import "./PicksTable.scss";

/** Rank, player, college score, pro score, and total score. */
const FIXED_COLUMN_COUNT = 5;

/** MNF Points Pick, MNF Points Distance, and Pro Score ATS. */
const TIEBREAKER_COLUMN_COUNT = 3;

/** Marks every cell of the column the pointer is over, heading included. */
const COLUMN_HOVER_CLASS = "--column-hover";

/**
 * Lights the cells of one game's column and unlights the rest, on the DOM. A
 * hover moves with the pointer, and going through state would render every cell
 * of every row each time it crossed one.
 */
function litColumn(table: HTMLTableElement, game: string | undefined) {
  table.querySelectorAll<HTMLElement>("[data-game]").forEach((cell) => {
    cell.classList.toggle(COLUMN_HOVER_CLASS, cell.dataset.game === game);
  });
}

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
      <th
        key={header}
        className={PICK_COL_CLASS}
        scope="col"
        data-game={header}
      >
        {/* Opens the same game every cell under this heading opens, which is the
            one row of the column a reader with no pick of their own can reach. */}
        <button
          type="button"
          className="table__cell-button"
          // Screen readers re-announce this heading on every cell below it.
          // aria-label comma-joins the word, since flex spacing runs it into the label.
          aria-label={[header, heading?.word]
            .filter((part) => part != null)
            .join(", ")}
          onClick={() => onClick(header)}
        >
          {/* Before the label, where the dialog's own mark carries its shape. */}
          {heading?.mark}
          {/* Wrapped so a mark beside it can be centered on the capitals it is
              set in rather than on the line box they sit in. */}
          <span className="table__heading-label">{header}</span>
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
  isShown,
  pickChanges,
  onClick,
}: {
  /** The row these cells belong to, which two players can share a name in. */
  playerId: string;
  picks: Array<PickResult>;
  labels: Array<string>;
  /** Whether a game's column is drawn, by its label. */
  isShown: (gameLabel: string) => boolean;
  pickChanges: Map<string, Status>;
  onClick: (gameLabel: string) => void;
}) {
  return (
    <>
      {picks.map(
        (result, index) =>
          isShown(labels[index]) && (
            <td
              key={pickChangeKey(playerId, labels[index])}
              className={getClasses("table__pick", `--${fillStatus(result)}`)}
              data-game={labels[index]}
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
          ),
      )}
    </>
  );
}

function PicksTable({
  scores,
  caption = "Player picks for the week, college and pro games",
  players,
  games,
  showsTiebreakers = false,
}: {
  scores?: RakMadnessScores | null;
  caption?: string;
  /** The ids of the rows drawn, or every row when left out. Ranks still count every row. */
  players?: ReadonlySet<string>;
  /** The labels of the game columns drawn, or every column when left out. */
  games?: ReadonlySet<string>;
  /** Adds the scoreboard's tiebreaker columns: both MNF Points ones and Pro Score ATS. */
  showsTiebreakers?: boolean;
}) {
  const showGameStatus = useShowGameStatus();
  const { picks: pickChanges } = useScoreChanges();
  const hovered = useRef<{ table: HTMLTableElement; game?: string }>(undefined);

  // A refresh that redraws a cell replaces the class the pointer put on it.
  useLayoutEffect(() => {
    if (hovered.current) litColumn(hovered.current.table, hovered.current.game);
  });

  // Every cell of a game's column opens the same game, so the whole column
  // answers to the pointer, not just the cell.
  function trackHover(event: PointerEvent<HTMLTableElement>) {
    if (event.pointerType === "touch") return;
    const cell = (event.target as Element).closest<HTMLElement>("[data-game]");
    hover(event.currentTarget, cell?.dataset.game);
  }

  function hover(table: HTMLTableElement, game: string | undefined) {
    hovered.current = { table, game };
    litColumn(table, game);
  }

  if (scores == null) {
    return null;
  }

  // Marked wherever a name shows, since a name two rows share reads as one player
  // and the analysis behind it cannot answer for either.
  const repeated = repeatedNames(scores.scores);
  const firstPlayer = scores.scores[0];
  const collegeCount = firstPlayer.college.length;
  const proCount = firstPlayer.pro.length;
  // Built once for the headers and every row's cells, so a cell and the column it
  // sits under cannot disagree about which game they mean.
  const collegeLabels = leagueLabels(collegeCount, "college");
  const proLabels = leagueLabels(proCount, "pro");
  const isShown = (label: string) => games == null || games.has(label);
  const shownCollege = collegeLabels.filter(isShown);
  const shownPro = proLabels.filter(isShown);
  const columnCount =
    FIXED_COLUMN_COUNT +
    (showsTiebreakers ? TIEBREAKER_COLUMN_COUNT : 0) +
    shownCollege.length +
    shownPro.length;
  const statuses = statusByLabel(scores.games);

  return (
    <TableShell
      caption={caption}
      columnCount={columnCount}
      onPointerOver={trackHover}
      onPointerLeave={(event) => hover(event.currentTarget, undefined)}
      header={
        <>
          <th scope="col">Rank</th>
          <th className={PLAYER_COL_CLASS} scope="col">
            Player
          </th>
          {leagueHeaders({
            labels: shownCollege,
            statusByLabel: statuses,
            onClick: showGameStatus,
          })}
          <th scope="col">College Score</th>
          {leagueHeaders({
            labels: shownPro,
            statusByLabel: statuses,
            onClick: showGameStatus,
          })}
          <th scope="col">Pro Score</th>
          {showsTiebreakers && (
            <>
              <th scope="col">Pro Score ATS</th>
              <th scope="col">MNF Points Pick</th>
              <th scope="col">MNF Points Distance</th>
            </>
          )}
          <th scope="col">Total Score</th>
        </>
      }
    >
      {scores.scores.map((player: PlayerScore, index: number) => {
        if (players != null && !players.has(player.id)) return null;
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
              isShown={isShown}
              pickChanges={pickChanges}
              onClick={showGameStatus}
            />
            <td>{player.score.college}</td>
            <PickCells
              playerId={player.id}
              picks={player.pro}
              labels={proLabels}
              isShown={isShown}
              pickChanges={pickChanges}
              onClick={showGameStatus}
            />
            <td>{player.score.pro}</td>
            {showsTiebreakers && (
              <>
                <td>{player.score.proAgainstTheSpread}</td>
                <td>{player.tiebreaker.pick ?? "N/A"}</td>
                <td>{player.tiebreaker.distance ?? "N/A"}</td>
              </>
            )}
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
