import { GameStatus } from "../../types/ESPN";
import { League } from "../../types/League";
import { LEAGUES as LEAGUE_KEYS } from "../../utils/scoring/gameColumns";
import { ESPN_LEAGUE } from "../../utils/scoring/leagueResults";
import kickoffDay, { KickoffDay } from "./kickoffDay";
import { COMPLETED_TITLE, DAYS, LIVE_TITLE } from "./sectionTitles";

/** Every league a card page polls. */
export const POLLED_LEAGUES: ReadonlyArray<League> = LEAGUE_KEYS.map(
  (key) => ESPN_LEAGUE[key],
);

/** ESPN's `in` state, a game stopped part way through included. */
export const LIVE_STATUSES: ReadonlySet<GameStatus> = new Set([
  GameStatus.LIVE,
  GameStatus.DELAYED,
]);

/** One card, with where its game stands. No `kickoff` is a game with no date. */
export type PlacedGame<T> = { card: T; status: GameStatus; kickoff?: Date };

export type GameSection<T> = { title: string; cards: Array<T> };

function kickoffTime({ kickoff }: PlacedGame<unknown>): number {
  return kickoff?.getTime() ?? Number.POSITIVE_INFINITY;
}

/**
 * A card page's sections, in page order. The games being played first, then those
 * to come by the reader's own calendar day and kickoff, then the finished ones.
 * Live and finished games keep the order they came in. A game with no kickoff to
 * read goes under Upcoming, last. A section with no game is left out.
 */
export default function gameSections<T>(
  games: Array<PlacedGame<T>>,
  now: Date,
): Array<GameSection<T>> {
  const live = games.filter(({ status }) => LIVE_STATUSES.has(status));
  const upcoming = games
    .filter(({ status }) => status === GameStatus.UPCOMING)
    .sort((a, b) => kickoffTime(a) - kickoffTime(b));
  const completed = games.filter(({ status }) => status === GameStatus.FINAL);
  const dayOf = ({ kickoff }: PlacedGame<T>) =>
    kickoff == null ? KickoffDay.LATER : kickoffDay(kickoff, now);

  return [
    { title: LIVE_TITLE, games: live },
    ...DAYS.map(({ title, day }) => ({
      title,
      games: upcoming.filter((game) => dayOf(game) === day),
    })),
    { title: COMPLETED_TITLE, games: completed },
  ].flatMap(({ title, games: placed }) =>
    placed.length === 0
      ? []
      : [{ title, cards: placed.map(({ card }) => card) }],
  );
}
