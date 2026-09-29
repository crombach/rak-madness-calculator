import { ReactNode, useId } from "react";
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
import kickoffDay, { KickoffDay } from "./kickoffDay";
import { LIVE_TITLE } from "./LiveGamesSkeleton";
import "./LiveGames.scss";

const LEAGUES: ReadonlyArray<League> = [League.COLLEGE, League.PRO];

/** ESPN's `in` state, a game stopped part way through included. */
const LIVE_STATUSES: ReadonlySet<GameStatus> = new Set([
  GameStatus.LIVE,
  GameStatus.DELAYED,
]);

const FETCHING_LABEL = "Fetching the games";
/** Each day's section, in page order. */
const DAYS: ReadonlyArray<{ day: KickoffDay; title: string }> = [
  { day: KickoffDay.TODAY, title: "Today" },
  { day: KickoffDay.TOMORROW, title: "Tomorrow" },
  { day: KickoffDay.LATER, title: "Upcoming" },
];

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
        players={scores.scores}
        brief
      />
    </li>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="live-games__section" aria-labelledby={id}>
      <h2 id={id} className="live-games__section-title">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Every game of the week not over, each as the Game Status dialog shows it. The
 * ones being played first, then the rest by the reader's own calendar day.
 */
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
    holdForKickoff: false,
  });
  const current = (scores?.games ?? []).flatMap((game) =>
    game.result == null
      ? []
      : [{ game, result: fetched?.get(game.result.id) ?? game.result }],
  );
  const live = current.filter(({ result }) => LIVE_STATUSES.has(result.status));
  const now = new Date();
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
      <Section title={LIVE_TITLE}>
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
      </Section>
      {scores != null &&
        DAYS.map(({ day, title }) => {
          const games = upcoming.filter(
            ({ result }) => kickoffDay(result.date, now) === day,
          );
          if (games.length === 0) return null;
          return (
            <Section key={day} title={title}>
              <ul className="live-games__list">
                {games.map(({ game, result }) => (
                  <LiveGame
                    key={game.label}
                    game={game}
                    result={result}
                    scores={scores}
                  />
                ))}
              </ul>
            </Section>
          );
        })}
    </div>
  );
}
