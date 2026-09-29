import useLiveWeek from "../../hooks/useLiveWeek";
import useMyPick from "../../hooks/useMyPick";
import { GameStatus } from "../../types/ESPN";
import { League } from "../../types/League";
import { LeagueResult } from "../../types/LeagueResult";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import { WeekGame } from "../../types/WeekGame";
import { LeagueResults } from "../../utils/scoring/leagueResults";
import GameStatusSummary, { SpreadLine } from "../gameStatus/GameStatusSummary";
import { HEADING_MARK } from "../table/picks/headingMark";
import "./LiveGames.scss";

const LEAGUES: ReadonlyArray<League> = [League.COLLEGE, League.PRO];

/** ESPN's `in` state, a game stopped part way through included. */
const LIVE_STATUSES: ReadonlySet<GameStatus> = new Set([
  GameStatus.LIVE,
  GameStatus.DELAYED,
]);

function LiveGame({
  game,
  result,
  scores,
}: {
  game: WeekGame;
  result: LeagueResult;
  scores: RakMadnessScores;
}) {
  const heading = HEADING_MARK[result.status];
  const myPick = useMyPick(scores, game);
  return (
    <li className="live-games__game">
      <div className="live-games__header">
        <h2 className="live-games__heading">
          {heading?.mark}
          <span className="live-games__sr-only">{heading?.word}</span>
          <span className="live-games__label">{game.label}</span>
          <span className="live-games__name">{game.name}</span>
        </h2>
        <SpreadLine
          spread={game.spread}
          myPick={myPick}
          className="live-games__pick"
        />
      </div>
      <GameStatusSummary game={game} result={result} myPick={myPick} brief />
    </li>
  );
}

/** Every game of the week being played now, each as the Game Status dialog shows it. */
export default function LiveGames({
  scores,
  onPoll,
}: {
  scores?: RakMadnessScores;
  onPoll?: (
    leagues: ReadonlyArray<League>,
  ) => Promise<LeagueResults | undefined>;
}) {
  const { fetched } = useLiveWeek({
    active: true,
    leagues: LEAGUES,
    games: scores?.games,
    onPoll,
  });
  const live = (scores?.games ?? []).flatMap((game) => {
    if (game.result == null) return [];
    const result = fetched?.get(game.result.id) ?? game.result;
    return LIVE_STATUSES.has(result.status) ? [{ game, result }] : [];
  });

  return (
    <div className="live-games">
      {scores == null || live.length === 0 ? (
        <p className="game-status__missing" role="status">
          No games are live right now
        </p>
      ) : (
        <ul className="live-games__list">
          {live.map(({ game, result }) => (
            <LiveGame
              key={game.label}
              game={game}
              result={result}
              scores={scores}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
