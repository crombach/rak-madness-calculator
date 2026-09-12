export enum HomeAway {
  HOME = "home",
  AWAY = "away",
}

export enum GameStatus {
  UPCOMING = "1",
  LIVE = "2",
  FINAL = "3",
}

export type EspnEvent = {
  id: string;
  name: string;
  shortName: string;
  date: string;
  competitions: Array<EspnCompetition>;
  status: EspnStatus;
};

/** Whether a game has yet to start, is underway, or is over. */
export type EspnState = "pre" | "in" | "post";

/** The state ESPN sends beside each of the three ids above. */
export const ESPN_STATE: Record<GameStatus, EspnState> = {
  [GameStatus.UPCOMING]: "pre",
  [GameStatus.LIVE]: "in",
  [GameStatus.FINAL]: "post",
};

export type EspnStatus = {
  /** Which quarter the game is in, counting on past four into overtime. */
  period?: number;
  /** The clock as ESPN writes it, like `8:42`. */
  displayClock?: string;
  type: {
    /**
     * ESPN's fine-grained status. Far more ids than the three above: halftime,
     * the end of a quarter, postponed and canceled each have their own.
     */
    id: GameStatus;
    state: EspnState;
    shortDetail: string;
  };
};

export type EspnCompetition = {
  competitors: Array<EspnCompetitor>;
  situation?: EspnSituation;
  date: string;
  venue?: EspnVenue;
  /** Set for a game played at neither team's own ground, which bowl games are. */
  neutralSite?: boolean;
};

export type EspnVenue = {
  address?: {
    city?: string;
    state?: string;
  };
};

export type EspnCompetitor = {
  id: string;
  homeAway: HomeAway;
  team: EspnTeam;
  score: string;
  records?: Array<EspnRecord>;
  /** One entry per period played, in order. Absent before kickoff. */
  linescores?: Array<EspnLinescore>;
};

/** `type` tells the season record ("total") from the home and road splits. */
export type EspnRecord = {
  type?: string;
  summary?: string;
};

export type EspnLinescore = {
  value?: number;
};

export type EspnSituation = {
  downDistanceText?: string;
  possession: string; // Team ID
};

export type EspnTeam = {
  /** Where the team plays: a city for the pros, a school for the colleges. */
  location?: string;
  /** What they are called there: `Bills`, `Buckeyes`. */
  name?: string;
  displayName: string;
  shortDisplayName: string;
  abbreviation: string;
  /** The team's mark, which ESPN leaves off the smaller college programs. */
  logo?: string;
};
