import useLiveWeek from "../../hooks/useLiveWeek";
import useMyPick from "../../hooks/useMyPick";
import { League } from "../../types/League";
import { LeagueResult } from "../../types/LeagueResult";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import { WeekGame } from "../../types/WeekGame";
import { LeagueResults } from "../../utils/scoring/leagueResults";
import EmptyState from "../pageLayout/EmptyState";
import GameCard from "./GameCard";
import gameSections, {
  FETCHING_LABEL,
  LIVE_STATUSES,
  POLLED_LEAGUES,
} from "./gameSections";
import { GameSection } from "./SectionTitle";
import "./Games.scss";

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

/** Every game of the week, each as the Game Status dialog shows it, under `gameSections`. */
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
    leagues: POLLED_LEAGUES,
    games: scores?.games,
    onPoll,
    holdForKickoff: false,
  });
  const current = (scores?.games ?? []).flatMap((game) =>
    game.result == null
      ? []
      : [{ game, result: fetched?.get(game.result.id) ?? game.result }],
  );
  const sections = gameSections(
    current.map((card) => ({
      card,
      status: card.result.status,
      kickoff: card.result.date,
    })),
    new Date(),
  );

  const isFetching = current.some(
    ({ game, result }) =>
      LIVE_STATUSES.has(result.status) && fetchingLeagues?.has(game.league),
  );

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
        sections.map(({ title, cards }) => (
          <GameSection
            key={title}
            className="games__section"
            title={title}
            count={cards.length}
          >
            <ul className="games__list">
              {cards.map(({ game, result }) => (
                <PoolGame
                  key={game.label}
                  game={game}
                  result={result}
                  scores={scores}
                />
              ))}
            </ul>
          </GameSection>
        ))}
    </div>
  );
}
