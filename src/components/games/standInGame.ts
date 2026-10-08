import { GameStatus } from "../../types/ESPN";
import { League } from "../../types/League";
import { GameSide, LeagueResult } from "../../types/LeagueResult";
import { WeekGame } from "../../types/WeekGame";

/**
 * A transparent pixel, so the stand-in draws the mark's box without a request for an
 * image nobody sees.
 */
const BLANK_LOGO =
  "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEAAAAALAAAAAABAAEAAAI=";

function standInSide(abbreviation: string): GameSide {
  return {
    // A place and a mascot, so the name takes the two lines a loaded one does.
    team: {
      name: abbreviation,
      abbreviation,
      location: abbreviation,
      mascot: abbreviation,
      logoUrl: BLANK_LOGO,
    },
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

/** The reader's pick on a stand-in card, which holds its line while picks load. */
export const STAND_IN_PICK = "AWY -3";
