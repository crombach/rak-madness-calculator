import { GameStatus } from "../../types/ESPN";
import { League } from "../../types/League";
import { GameSide, LeagueResult } from "../../types/LeagueResult";
import { WeekGame } from "../../types/WeekGame";
import rangeWithPrefix from "../../utils/rangeWithPrefix";
import { RESULTS_PAGE } from "../results/resultsPath";
import SkeletonStatus from "../pageLayout/SkeletonStatus";
import GameCard from "./GameCard";
import SectionTitle from "./SectionTitle";
import { COMPLETED_TITLE } from "./sectionTitles";
import "./Games.scss";

// Four rows at the two-column width, enough to fill a tall screen.
const STAND_IN_GAMES = 8;

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
const STAND_IN_RESULT: LeagueResult = {
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

const STAND_IN: WeekGame = {
  label: "G1",
  league: League.PRO,
  name: STAND_IN_RESULT.shortName,
  result: STAND_IN_RESULT,
};

/**
 * One section of stand-in cards under a blank title, for while the week or the
 * page loads. Blank because which sections the week has is not known yet, and a
 * title that changes when it lands reads as the week changing.
 */
export default function GamesSkeleton() {
  return (
    <>
      <SkeletonStatus page={RESULTS_PAGE.games} />
      <div className="games --loading" aria-hidden="true" inert>
        <div className="games__section">
          <SectionTitle title={COMPLETED_TITLE} count={STAND_IN_GAMES} />
          <ul className="games__list">
            {rangeWithPrefix(STAND_IN_GAMES, "G").map((key) => (
              <GameCard
                key={key}
                game={STAND_IN}
                result={STAND_IN_RESULT}
                players={[]}
              />
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
