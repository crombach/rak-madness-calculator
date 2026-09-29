import { LeagueResult } from "../../types/LeagueResult";
import { PlayerScore } from "../../types/RakMadnessScores";
import { WeekGame } from "../../types/WeekGame";
import GameStatusSummary, { SpreadLine } from "../gameStatus/GameStatusSummary";
import { HEADING_MARK } from "../table/picks/headingMark";
import "./LiveGames.scss";

/** One game on the page, as the Game Status dialog shows it under a band. */
export default function LiveGameCard({
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
  const heading = HEADING_MARK[result.status];
  return (
    <li className="live-games__game">
      <div className="live-games__header">
        <h3 className="live-games__heading">
          {heading?.mark}
          <span className="live-games__sr-only">{heading?.word}</span>
          <span className="live-games__label">{game.label}</span>
          <span className="live-games__name">{game.name}</span>
        </h3>
        <SpreadLine
          spread={game.spread}
          myPick={myPick}
          className="live-games__pick"
        />
      </div>
      <GameStatusSummary
        game={game}
        result={result}
        myPick={myPick}
        players={players}
        brief
      />
    </li>
  );
}
