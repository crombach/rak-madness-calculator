import { useMemo } from "react";
import { Navigate, useParams } from "react-router";
import useLiveWeek from "../../hooks/useLiveWeek";
import { GameStatus } from "../../types/ESPN";
import { League } from "../../types/League";
import { RakMadnessScores } from "../../types/RakMadnessScores";
import { LeagueResults } from "../../utils/scoring/leagueResults";
import { KnockoutGames } from "../../utils/scoring/knockoutTypes";
import gameSections, {
  FETCHING_LABEL,
  LIVE_STATUSES,
  POLLED_LEAGUES,
} from "../games/gameSections";
import { GameSection } from "../games/SectionTitle";
import resultsPath, { RESULTS_PAGE } from "../results/resultsPath";
import KnockoutCard from "./KnockoutCard";
import "./Knockouts.scss";
/**
 * Each open game, with who it knocks out whichever way it falls, and each final one
 * with who it knocked out, in `gameSections` as Games has them, polled as Games
 * is. A game ESPN does not list has no status to read, so it waits under
 * Upcoming until it is final.
 */
export default function Knockouts({
  scores,
  knockouts,
  onPoll,
  fetchingLeagues,
}: {
  scores?: RakMadnessScores;
  /** Undefined while the scores, or the code that reads them, load. */
  knockouts?: KnockoutGames;
  /** Which leagues have a request in flight, which is what the busy bar says. */
  fetchingLeagues?: ReadonlySet<League>;
  onPoll?: (
    leagues: ReadonlyArray<League>,
  ) => Promise<LeagueResults | undefined>;
}) {
  const { season, week } = useParams();
  const { fetched } = useLiveWeek({
    active: true,
    leagues: POLLED_LEAGUES,
    games: scores?.games,
    onPoll,
    holdForKickoff: false,
  });
  const weekGames = useMemo(
    () => new Map(scores?.games?.map((game) => [game.label, game])),
    [scores],
  );
  const knockedOut = useMemo(
    () =>
      new Set(
        scores?.scores
          .filter((player) => player.status.isKnockedOut)
          .map((player) => player.name),
      ),
    [scores],
  );

  if (knockouts == null) return null;
  // No game knocked anyone out, and none open can.
  if (knockouts.games.length === 0) {
    return (
      <Navigate
        replace
        to={resultsPath(season, week, RESULTS_PAGE.scoreboard)}
      />
    );
  }

  const sections = gameSections(
    knockouts.games.map((game) => {
      const weekGame = weekGames.get(game.label);
      const result =
        weekGame?.result &&
        (fetched?.get(weekGame.result.id) ?? weekGame.result);
      return {
        card: { game, weekGame, status: result?.status },
        status:
          result?.status ??
          (game.isFinal ? GameStatus.FINAL : GameStatus.UPCOMING),
        kickoff: result?.date,
      };
    }),
    new Date(),
  );
  const isFetching = sections.some(({ cards }) =>
    cards.some(
      ({ weekGame, status }) =>
        status != null &&
        LIVE_STATUSES.has(status) &&
        weekGame != null &&
        fetchingLeagues?.has(weekGame.league),
    ),
  );
  return (
    <div className="knockouts">
      {isFetching && (
        <span
          className="knockouts__progress --live"
          role="progressbar"
          aria-busy="true"
          aria-label={FETCHING_LABEL}
        />
      )}
      {sections.map(({ title, cards }) => (
        <GameSection
          key={title}
          className="knockouts__section"
          title={title}
          count={cards.length}
        >
          <ul className="knockouts__list">
            {cards.map(({ game, weekGame, status }) => (
              <KnockoutCard
                key={game.label}
                game={game}
                weekGame={weekGame}
                status={status}
                knockedOut={knockedOut}
              />
            ))}
          </ul>
        </GameSection>
      ))}
    </div>
  );
}
