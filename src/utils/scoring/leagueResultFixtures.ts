import { GameStatus, HomeAway } from "../../types/ESPN";
import { LeagueResult } from "../../types/LeagueResult";

const NO_POSSESSION = {};
const GAME_DATE = new Date("2024-10-06T17:00:00Z");

function team(abbreviation: string) {
  return { name: abbreviation, abbreviation };
}

/** A side with nothing but its name and its score, which is all scoring reads. */
function side(abbreviation: string, score: number) {
  return { team: team(abbreviation), score, linescores: [] };
}

/** Every fixture game is the only one in its test, so they can share an id. */
const EVENT_ID = "1";

/**
 * A completed game. `by` is the winner's margin, which is what the spread is
 * compared against, so it is derived from the scores rather than passed in.
 */
export function finalGame({
  home,
  away,
  homeScore,
  awayScore,
}: {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
}): LeagueResult {
  const homeTeam = team(home);
  const awayTeam = team(away);
  const isTie = homeScore === awayScore;
  const homeWon = homeScore > awayScore;
  return {
    id: EVENT_ID,
    name: `${away} at ${home}`,
    shortName: `${away} @ ${home}`,
    date: GAME_DATE,
    status: GameStatus.FINAL,
    detailMessage: "Final",
    isNeutralSite: false,
    home: { team: homeTeam, score: homeScore, linescores: [] },
    away: { team: awayTeam, score: awayScore, linescores: [] },
    possession: NO_POSSESSION,
    winner: {
      team: isTie ? null : homeWon ? homeTeam : awayTeam,
      homeAway: isTie ? null : homeWon ? HomeAway.HOME : HomeAway.AWAY,
      by: Math.abs(homeScore - awayScore),
    },
    loser: {
      team: isTie ? null : homeWon ? awayTeam : homeTeam,
      homeAway: isTie ? null : homeWon ? HomeAway.AWAY : HomeAway.HOME,
      by: Math.abs(homeScore - awayScore),
    },
    totalScore: homeScore + awayScore,
  };
}

/** A game still being played. */
export function liveGame({
  home,
  away,
  homeScore,
  awayScore,
}: {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
}): LeagueResult {
  return {
    id: EVENT_ID,
    name: `${away} at ${home}`,
    shortName: `${away} @ ${home}`,
    date: GAME_DATE,
    status: GameStatus.LIVE,
    detailMessage: "8:42 - 3rd Quarter",
    isNeutralSite: false,
    home: side(home, homeScore),
    away: side(away, awayScore),
    possession: NO_POSSESSION,
    winner: { team: null, homeAway: null, by: 0 },
    loser: { team: null, homeAway: null, by: 0 },
    totalScore: homeScore + awayScore,
  };
}

/**
 * A game that stopped, whether before kickoff or part way through. `period` is the
 * quarter it stopped in, and `0` says no quarter was played, which is the number
 * ESPN sends before kickoff.
 */
export function delayedGame({
  home,
  away,
  homeScore,
  awayScore,
  period,
}: {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  period: number;
}): LeagueResult {
  return {
    ...liveGame({ home, away, homeScore, awayScore }),
    status: GameStatus.DELAYED,
    detailMessage: "Delayed",
    period,
  };
}

/** A game that has not kicked off. Scoring treats it as incomplete. */
export function upcomingGame({
  home,
  away,
}: {
  home: string;
  away: string;
}): LeagueResult {
  return {
    id: EVENT_ID,
    name: `${away} at ${home}`,
    shortName: `${away} @ ${home}`,
    date: GAME_DATE,
    status: GameStatus.UPCOMING,
    detailMessage: "Sun, October 6th",
    isNeutralSite: false,
    home: side(home, 0),
    away: side(away, 0),
    possession: NO_POSSESSION,
    winner: { team: null, homeAway: null, by: 0 },
    loser: { team: null, homeAway: null, by: 0 },
    totalScore: 0,
  };
}
