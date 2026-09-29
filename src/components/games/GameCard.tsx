import { LeagueResult } from "../../types/LeagueResult";
import { PlayerScore } from "../../types/RakMadnessScores";
import { WeekGame } from "../../types/WeekGame";
import GameMark from "../gameStatus/GameMark";
import GameStatusSummary from "../gameStatus/GameStatusSummary";
import "./Games.scss";

/** One game on the page, as the Game Status dialog shows it under a band. */
export default function GameCard({
  game,
  result,
  myPick,
  players,
}: {
  game: WeekGame;
  result: LeagueResult;
  myPick?: string;
  players: ReadonlyArray<PlayerScore>;
}) {
  return (
    <li className="games__game">
      <div className="games__header">
        <h3 className="games__heading">
          <span className="games__label">{game.label}</span>
          <span className="games__name">{game.name}</span>
        </h3>
        <GameMark game={game} status={result.status} />
      </div>
      <GameStatusSummary
        game={game}
        result={result}
        myPick={myPick}
        players={players}
      />
    </li>
  );
}
