import { useEffect } from "react";
import { WeekGame } from "../types/WeekGame";
import warmImage from "../utils/warmImage";

/**
 * Every logo the week could show, asked for as soon as the week is scored rather
 * than when a game is opened, so the scoreline comes up with its marks already on
 * it.
 *
 * Held here rather than in the game status dialog, which is fetched on the click
 * that opens it. Warming from inside it would start the logos on that same click,
 * which is what this exists to get ahead of.
 *
 * In an effect rather than in the render, which a search keystroke repeats and
 * React may throw away.
 */
export default function useWarmTeamLogos(games: Array<WeekGame> | undefined) {
  useEffect(() => {
    games?.forEach((it) => {
      [it.result?.home.team.logoUrl, it.result?.away.team.logoUrl].forEach(
        (url) => {
          if (url != null) warmImage(url);
        },
      );
    });
  }, [games]);
}
