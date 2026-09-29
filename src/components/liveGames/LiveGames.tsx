import useLiveWeek from "../../hooks/useLiveWeek";
import useMyPick from "../../hooks/useMyPick";
import { GameStatus } from "../../types/ESPN";
import { League } from "../../types/League";
import { LeagueResult } from "../../types/LeagueResult";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import { WeekGame } from "../../types/WeekGame";
import { LeagueResults } from "../../utils/scoring/leagueResults";
import GameStatusSummary, { SpreadLine } from "../gameStatus/GameStatusSummary";
import { kickoffParts } from "../gameStatus/gameStatusText";
import { HEADING_MARK } from "../table/picks/headingMark";
import "./LiveGames.scss";

const LEAGUES: ReadonlyArray<League> = [League.COLLEGE, League.PRO];

/** ESPN's `in` state, a game stopped part way through included. */
const LIVE_STATUSES: ReadonlySet<GameStatus> = new Set([
  GameStatus.LIVE,
  GameStatus.DELAYED,
]);

const FETCHING_LABEL = "Fetching the games";
const NEXT_TITLE = "Up next";
const NEXT_ID = "live-games-next";
const KICKOFF_SEPARATOR = " · ";

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
      <GameStatusSummary
        game={game}
        result={result}
        myPick={myPick}
        players={scores.scores}
        brief
      />
    </li>
  );
}

/** Every game of the week being played now, each as the Game Status dialog shows it. */
export default function LiveGames({
  scores,
  onPoll,
  fetchingLeagues,
}: {
  scores?: RakMadnessScores;
  /** Which leagues have a request in flight, which is what the busy bar says. */
  fetchingLeagues?: ReadonlySet<League>;
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
  const current = (scores?.games ?? []).flatMap((game) =>
    game.result == null
      ? []
      : [{ game, result: fetched?.get(game.result.id) ?? game.result }],
  );
  const live = current.filter(({ result }) => LIVE_STATUSES.has(result.status));
  const upcoming = current
    .filter(({ result }) => result.status === GameStatus.UPCOMING)
    .sort((a, b) => a.result.date.getTime() - b.result.date.getTime());

  const isFetching = live.some(({ game }) => fetchingLeagues?.has(game.league));

  return (
    <div className="live-games">
      {isFetching && (
        <span
          className="live-games__progress --live"
          role="progressbar"
          aria-busy="true"
          aria-label={FETCHING_LABEL}
        />
      )}
      {scores == null || live.length === 0 ? (
        <p className="game-status__missing live-games__empty" role="status">
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
      {upcoming.length > 0 && (
        <section className="live-games__next" aria-labelledby={NEXT_ID}>
          <h2 id={NEXT_ID} className="live-games__next-title">
            {NEXT_TITLE}
          </h2>
          <ul className="live-games__next-list">
            {upcoming.map(({ game, result }) => (
              <li key={game.label} className="live-games__next-game">
                <span className="live-games__label">{game.label}</span>
                <span className="live-games__name">{game.name}</span>
                <span className="live-games__kickoff">
                  {kickoffParts(result.date).join(KICKOFF_SEPARATOR)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
