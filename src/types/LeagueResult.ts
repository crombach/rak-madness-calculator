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
  winner: {
    team: Team | null;
    homeAway: HomeAway | null;
    by: number;
  };
  loser: {
    team: Team | null;
    homeAway: HomeAway | null;
    by: number;
  };
  totalScore: number;
};
