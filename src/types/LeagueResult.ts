import { GameStatus, HomeAway } from "./ESPN";

type Team = {
  name: string;
  /** Where the team plays, and what they are called there: `Buffalo`, `Bills`. */
  location?: string;
  mascot?: string;
  abbreviation: string;
  logoUrl?: string;
};

export type Possession = {
  homeAway?: HomeAway;
  downDistanceText?: string;
  /** Absent where ESPN sent none, or where the clock has run on past it. */
  lastPlay?: LastPlay;
};

export type LastPlay = {
  /** ESPN's name for the play, like `Timeout` or `Passing Touchdown`. */
  type: string;
  /** Who called it, where it is a timeout that names its caller. */
  calledBy?: HomeAway;
  /** Who kicks off next, where it was a score a kickoff follows. */
  kicksOff?: HomeAway;
};

/**
 * The winning end of a finished game. `by` is the margin, which is zero for a
 * tie, where the team is absent.
 */
export type GameOutcome = {
  team: Team | null;
  homeAway: HomeAway | null;
  by: number;
};

export type GameSide = {
  team: Team;
  score: number;
  /** The season record, like `3-2`. Absent where ESPN did not send one. */
  record?: string;
  /** Points per period, in order. */
  linescores: Array<number>;
};

export type LeagueResult = {
  /** The ESPN event id, which is what a single game is fetched again by. */
  id: string;
  name: string;
  shortName: string;
  date: Date;
  /**
   * When the game ended, off ESPN's last play. Null where ESPN has no plays for the
   * game. Absent before the game is final, and while ESPN has not answered.
   */
  finishedAt?: Date | null;
  status: GameStatus;
  detailMessage: string;
  period?: number;
  clock?: string;
  home: GameSide;
  away: GameSide;
  /**
   * ESPN still names a home side for a neutral-site game, and the pool still scores
   * the line against it, so the two sides are only ever said to be home and away
   * where they are.
   */
  isNeutralSite: boolean;
  /**
   * The town the game is played in, like `Orchard Park, NY`. Absent where ESPN sent
   * no address for the ground, which the smaller college venues have.
   */
  venue?: string;
  possession: Possession;
  winner: GameOutcome;
  totalScore: number;
};
