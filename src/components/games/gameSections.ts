import { GameStatus } from "../../types/ESPN";
import { League } from "../../types/League";
import { LEAGUES as LEAGUE_KEYS } from "../../utils/scoring/gameColumns";
import compareFinish, {
  Finish,
  validTime,
} from "../../utils/scoring/finishOrder";
import { ESPN_LEAGUE } from "../../utils/scoring/leagueResults";
import kickoffDay, { KickoffDay } from "./kickoffDay";
import { COMPLETED_TITLE, DAYS, LIVE_TITLE } from "./sectionTitles";

/** What a card page's busy bar is called. */
export const FETCHING_LABEL = "Fetching the games";

/** Every league a card page polls. */
export const POLLED_LEAGUES: ReadonlyArray<League> = LEAGUE_KEYS.map(
  (key) => ESPN_LEAGUE[key],
);

/** ESPN's `in` state, a game stopped part way through included. */
export const LIVE_STATUSES: ReadonlySet<GameStatus> = new Set([
  GameStatus.LIVE,
  GameStatus.DELAYED,
]);

/**
 * One card, with where its game stands. No `kickoff`, or one that does not
 * parse, is a game with no date. No `finishedAt` is a game not over, or one
 * with no end ESPN has given.
 */
export type PlacedGame<T> = Finish & { card: T; status: GameStatus };

export type SectionCards<T> = { title: string; cards: Array<T> };

function kickoffTime({ kickoff }: PlacedGame<unknown>): number {
  return validTime(kickoff) ?? Number.POSITIVE_INFINITY;
}

/**
 * A card page's sections, in page order. The games being played first, then those
 * to come by the reader's own calendar day and kickoff, then the finished ones.
 * Live games keep the order they came in. Finished ones go in the reverse of
 * `compareFinish`, the order knockouts are credited in: latest to end first,
 * with a game ESPN gave no end for above them all. A tie puts the later card
 * first. A game with no kickoff to read goes under Upcoming, last. A section
 * with no game is left out.
 */
export default function gameSections<T>(
  games: Array<PlacedGame<T>>,
  now: Date,
): Array<SectionCards<T>> {
  const live = games.filter(({ status }) => LIVE_STATUSES.has(status));
  const upcoming = games
    .filter(({ status }) => status === GameStatus.UPCOMING)
    .sort((a, b) => kickoffTime(a) - kickoffTime(b));
  const completed = games
    .map((game, order) => ({ game, order }))
    .filter(({ game }) => game.status === GameStatus.FINAL)
    .sort((a, b) => compareFinish(b.game, a.game) || b.order - a.order)
    .map(({ game }) => game);
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
