import { GameStatus } from "../types/ESPN";
import { League } from "../types/League";
import { LeagueResult } from "../types/LeagueResult";
import { WeekGame } from "../types/WeekGame";
import { LeagueResults } from "../utils/scoring/leagueResults";
import useLiveWeek from "./useLiveWeek";

/**
 * One game, kept up to date for as long as it is being looked at, by polling its
 * league through `useLiveWeek`.
 *
 * `shown` is the fresher answer alone. Nothing is returned until one lands, and the
 * caller shows the week's own copy of the game meanwhile.
 */
export default function useLiveGame({
  open,
  game,
  games,
  onPoll,
}: {
  open: boolean;
  game?: WeekGame;
  games?: Array<WeekGame>;
  onPoll?: (
    leagues: ReadonlyArray<League>,
  ) => Promise<LeagueResults | undefined>;
}): { shown?: LeagueResult } {
  const eventId = game?.result?.id;
  const { fetched } = useLiveWeek({
    active: open && eventId != null,
    leagues: game != null ? [game.league] : [],
    games,
    onPoll,
    restartOn: eventId,
  });
  // A game the week was scored on after it finished cannot come back any other way,
  // so it is shown as the scoring pass left it rather than asked about again.
  const settled =
    game?.result?.status === GameStatus.FINAL ? game.result : undefined;
  return {
    shown: settled ?? (eventId != null ? fetched?.get(eventId) : undefined),
  };
}
