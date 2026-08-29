import { League } from "./League";
import { LeagueResult } from "./LeagueResult";

/**
 * The pool's own line on a game, always from the favored side, so `points` is never
 * above zero. The picks write it either way round, and this is the one reading of it.
 */
export type GameSpread = {
  team: string;
  points: number;
};

/** One picks column, and the game it was picked against. */
export type WeekGame = {
  label: string;
  league: League;
  /** What the game is called where there is no result to name it after. */
  name: string;
  /** Absent where no ESPN event answered the teams this column was picked with. */
  result?: LeagueResult;
  /** Absent where the picks carried no spread for the game, or disagreed about it. */
  spread?: GameSpread;
};
