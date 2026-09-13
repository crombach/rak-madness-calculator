import { memo } from "react";
import { PlayerScore, RakMadnessScores } from "../../../types/RakMadnessScores";
import PlayerName from "../playerName/PlayerName";
import repeatedNames from "../../../utils/scoring/repeatedNames";
import TableShell, { PLAYER_COL_CLASS, RankCell } from "../TableShell";

/** Rank, player, MNF pick, MNF distance, college, pro, pro ATS, and total. */
const COLUMN_COUNT = 8;

function ScoresTable({ scores }: { scores?: RakMadnessScores | null }) {
  if (scores == null) {
    return null;
  }

  // Marked wherever a name shows, since a name two rows share reads as one player
  // and the analysis behind it cannot answer for either.
  const repeated = repeatedNames(scores.scores);

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
          <th scope="col">MNF Points Pick</th>
          <th scope="col">MNF Points Distance</th>
          <th scope="col">College Score</th>
          <th scope="col">Pro Score</th>
          <th scope="col">Pro Score ATS</th>
          <th scope="col">Total Score</th>
        </>
      }
    >
      {scores.scores.map((player: PlayerScore, index: number) => (
        <tr key={player.id}>
          <RankCell rank={index + 1} />
          <PlayerName
            player={player}
            hasNameConflict={repeated.has(player.name)}
          />
          <td>{player.tiebreaker.pick ?? "N/A"}</td>
          <td>{player.tiebreaker.distance ?? "N/A"}</td>
          <td>{player.score.college}</td>
          <td>{player.score.pro}</td>
          <td>{player.score.proAgainstTheSpread}</td>
          <td>
            <b>{player.score.total}</b>
          </td>
        </tr>
      ))}
    </TableShell>
  );
}

export default memo(ScoresTable);
