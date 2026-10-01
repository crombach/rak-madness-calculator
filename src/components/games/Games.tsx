import { ReactNode, useId } from "react";
import useLiveWeek from "../../hooks/useLiveWeek";
import useMyPick from "../../hooks/useMyPick";
import { GameStatus } from "../../types/ESPN";
import { League } from "../../types/League";
import { LeagueResult } from "../../types/LeagueResult";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import { WeekGame } from "../../types/WeekGame";
import { LEAGUES as LEAGUE_KEYS } from "../../utils/scoring/gameColumns";
import { ESPN_LEAGUE, LeagueResults } from "../../utils/scoring/leagueResults";
import EmptyState from "../pageLayout/EmptyState";
import kickoffDay from "./kickoffDay";
import GameCard from "./GameCard";
import SectionTitle from "./SectionTitle";
import { COMPLETED_TITLE, DAYS, LIVE_TITLE } from "./sectionTitles";
import "./Games.scss";

const LEAGUES: ReadonlyArray<League> = LEAGUE_KEYS.map(
  (key) => ESPN_LEAGUE[key],
);

/** ESPN's `in` state, a game stopped part way through included. */
const LIVE_STATUSES: ReadonlySet<GameStatus> = new Set([
  GameStatus.LIVE,
  GameStatus.DELAYED,
]);

const FETCHING_LABEL = "Fetching the games";
const NO_GAMES = "No games this week";

function PoolGame({
  game,
  result,
  scores,
}: {
  game: WeekGame;
  result: LeagueResult;
  scores: RakMadnessScores;
}) {
  return (
    <GameCard
      game={game}
      result={result}
      myPick={useMyPick(scores, game)}
      players={scores.scores}
    />
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="games__section" aria-labelledby={id}>
      <SectionTitle id={id} title={title} count={count} />
      {children}
    </section>
  );
}

/**
 * Every game of the week, each as the Game Status dialog shows it. The ones being
 * played first, then those to come by the reader's own calendar day, then the
 * finished ones in table order. A section with no game is left out.
 */
export default function Games({
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
  const completed = current.filter(
    ({ result }) => result.status === GameStatus.FINAL,
  );

  const sections = [
    { title: LIVE_TITLE, games: live },
    ...DAYS.map(({ title, day }) => ({
      title,
      games: upcoming.filter(
        ({ result }) => kickoffDay(result.date, now) === day,
      ),
    })),
    { title: COMPLETED_TITLE, games: completed },
  ].filter(({ games }) => games.length > 0);

  const isFetching = live.some(({ game }) => fetchingLeagues?.has(game.league));

  return (
    <div className="games">
      {isFetching && (
        <span
          className="games__progress --live"
          role="progressbar"
          aria-busy="true"
          aria-label={FETCHING_LABEL}
        />
      )}
      {scores != null && sections.length === 0 && (
        <EmptyState>{NO_GAMES}</EmptyState>
      )}
      {scores != null &&
        sections.map(({ title, games }) => (
          <Section key={title} title={title} count={games.length}>
            <ul className="games__list">
              {games.map(({ game, result }) => (
                <PoolGame
                  key={game.label}
                  game={game}
                  result={result}
                  scores={scores}
                />
              ))}
            </ul>
          </Section>
        ))}
    </div>
  );
}
