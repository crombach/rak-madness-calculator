import { memo } from "react";
import { PlayerScore, RakMadnessScores } from "../../../types/RakMadnessScores";
import PlayerName from "../playerName/PlayerName";
import repeatedNames from "../../../utils/scoring/repeatedNames";
import { ranksOnMerit } from "../../../utils/scoring/comparePlayerScores";
import TableShell, { PLAYER_COL_CLASS, RankCell } from "../TableShell";
import { SCOREBOARD_COLUMNS } from "../../../utils/scoreboardColumns";

/** Rank and player, then the Scoreboard's own. */
const COLUMN_COUNT = 2 + SCOREBOARD_COLUMNS.length;

function ScoresTable({ scores }: { scores?: RakMadnessScores | null }) {
  if (scores == null) {
    return null;
  }

  // Marked wherever a name shows, since a name two rows share reads as one player
  // and the analysis behind it cannot answer for either.
  const repeated = repeatedNames(scores.scores);
  const ranks = ranksOnMerit(scores.scores);

  return (
    <TableShell
      caption="Player rankings for the week, by total score"
      columnCount={COLUMN_COUNT}
      header={
        <>
          <th scope="col">Rank</th>
          <th className={PLAYER_COL_CLASS} scope="col">
            Player
          </th>
          {SCOREBOARD_COLUMNS.map((column) => (
            <th key={column.header} scope="col">
              {column.header}
            </th>
          ))}
        </>
      }
    >
      {scores.scores.map((player: PlayerScore, index: number) => (
        <tr key={player.id}>
          <RankCell rank={ranks[index]} />
          <PlayerName
            player={player}
            hasNameConflict={repeated.has(player.name)}
          />
          {SCOREBOARD_COLUMNS.map((column) => (
            <td key={column.header}>{column.value(player)}</td>
          ))}
        </tr>
      ))}
    </TableShell>
  );
}

export default memo(ScoresTable);
