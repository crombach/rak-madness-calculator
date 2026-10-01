import { GameStatus } from "../../types/ESPN";
import { League } from "../../types/League";
import { GameSide, LeagueResult } from "../../types/LeagueResult";
import { WeekGame } from "../../types/WeekGame";

function standInSide(abbreviation: string): GameSide {
  return {
    team: { name: abbreviation, abbreviation },
    score: 0,
    record: "0-0",
    linescores: [],
  };
}

/**
 * A live game with every line a loaded card has filled in, so a card drawn from it
 * takes a loaded card's size. Its text is hidden under the wireframe's fills.
 */
export const STAND_IN_RESULT: LeagueResult = {
  id: "stand-in",
  name: "Away at Home",
  shortName: "AWY @ HOM",
  date: new Date(0),
  status: GameStatus.LIVE,
  detailMessage: "",
  period: 1,
  clock: "15:00",
  isNeutralSite: false,
  home: standInSide("HOM"),
  away: standInSide("AWY"),
  venue: "Venue",
  possession: {},
  winner: { team: null, homeAway: null, by: 0 },
  totalScore: 0,
};

export const STAND_IN: WeekGame = {
  label: "G1",
  league: League.PRO,
  name: STAND_IN_RESULT.shortName,
  result: STAND_IN_RESULT,
};
