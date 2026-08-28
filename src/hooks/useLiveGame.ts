import { useEffect, useRef, useState } from "react";
import { GameStatus } from "../types/ESPN";
import { WeekInfo } from "../types/League";
import { LeagueResult } from "../types/LeagueResult";
import { WeekGame } from "../types/WeekGame";
import { getGameResult } from "../utils/getLeagueResults";
import latestOnly from "../utils/latestOnly";

/** How often a game still being played is asked about again. */
export const POLL_MS = 20_000;

/**
 * One game, kept up to date for as long as it is being looked at.
 *
 * The week's scores carry the game as it stood when they were worked out, which is
 * stale the moment a live game moves, so a game is fetched again as it is shown and
 * then on `POLL_MS` until it is final. A game already final when it is opened is
 * never fetched at all, because nothing about it can differ.
 *
 * `shown` is the fresher answer alone. Nothing is returned until one lands, and the
 * caller shows the week's own copy of the game meanwhile, so a reader never waits
 * behind a fetch for a game they can already see.
 *
 * `games` is the scoring pass the answer belongs to. A rescore replaces every game,
 * so it takes the fetched one with it.
 */
export default function useLiveGame({
  open,
  game,
  games,
  week,
  season,
  onGameFinal,
}: {
  open: boolean;
  game?: WeekGame;
  games?: Array<WeekGame>;
  week?: WeekInfo;
  season?: number;
  /**
   * Called once a poll finds this game final, so the week's own scores and
   * `.table__cell-wipe` animations can catch up to an outcome the dialog saw
   * before the next scheduled refresh would have.
   */
  onGameFinal?: () => void;
}): { shown?: LeagueResult; isFetching: boolean } {
  // Held in a ref rather than read from the deps below. A rescore mints a new
  // callback, and depending on it would tear the poll down and start its 20s over
  // every time the week is scored again.
  const onFinal = useRef(onGameFinal);
  useEffect(() => {
    onFinal.current = onGameFinal;
  }, [onGameFinal]);

  const [found, setFound] = useState<{
    games: Array<WeekGame>;
    label: string;
    result: LeagueResult;
  }>();
  const [fetching, setFetching] = useState(false);

  // The pieces the fetch needs, rather than the game itself, so a rebuilt object
  // cannot restart the poll on every render.
  const label = game?.label;
  const league = game?.league;
  const eventId = game?.result?.id;
  // A game the week was scored on after it finished cannot come back any other way,
  // so it is shown as the scoring pass left it rather than asked about again.
  const settled =
    game?.result?.status === GameStatus.FINAL ? game.result : undefined;

  useEffect(() => {
    if (!open || games == null || week == null) return;
    if (label == null || league == null || eventId == null) return;
    if (settled != null) return;
    let timer = 0;
    const stop = latestOnly(async (isCurrent) => {
      const poll = async () => {
        let result: LeagueResult | null = null;
        setFetching(true);
        try {
          result = await getGameResult(league, week, eventId, season);
        } catch (error) {
          console.warn(`Failed to fetch game ${eventId}`, error);
        }
        if (!isCurrent()) return;
        setFetching(false);
        if (result != null) {
          setFound({ games, label, result });
        }
        // Rescheduled from the end of a fetch rather than on an interval, so a
        // slow answer cannot leave two requests running at once. A game with no
        // answer at all is asked about again, since the next week's list may hold
        // it.
        if (result == null || result.status !== GameStatus.FINAL) {
          timer = window.setTimeout(poll, POLL_MS);
        } else {
          onFinal.current?.();
        }
      };
      await poll();
    });
    return () => {
      stop();
      window.clearTimeout(timer);
      // The answer to the fetch this leaves behind is dropped, so nothing is
      // outstanding whatever it comes back with.
      setFetching(false);
    };
  }, [open, games, label, league, eventId, settled, week, season]);

  // Stamped with the game it was fetched for as well as the scoring pass, so an
  // answer that landed for the game before this one is never handed back for it.
  const shown =
    settled ??
    (found != null && found.games === games && found.label === label
      ? found.result
      : undefined);
  return { shown, isFetching: fetching };
}
