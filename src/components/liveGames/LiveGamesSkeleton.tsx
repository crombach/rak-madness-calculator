import { GameStatus } from "../../types/ESPN";
import { League } from "../../types/League";
import { GameSide, LeagueResult } from "../../types/LeagueResult";
import { WeekGame } from "../../types/WeekGame";
import rangeWithPrefix from "../../utils/rangeWithPrefix";
import LiveGameCard from "./LiveGameCard";
import "./LiveGames.scss";

// Here rather than in `LiveGames`, so the skeleton never pulls in the page's chunk.
export const LIVE_TITLE = "Live";

const GAME_COUNT = 2;

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

/** A wireframe of the live games list, for while the week or the page loads. */
export default function LiveGamesSkeleton() {
  return (
    <div className="live-games --loading" aria-hidden="true" inert>
      <div className="live-games__section">
        <span className="live-games__section-title">{LIVE_TITLE}</span>
        <ul className="live-games__list">
          {rangeWithPrefix(GAME_COUNT, "G").map((key) => (
            <LiveGameCard
              key={key}
              game={STAND_IN}
              result={STAND_IN_RESULT}
              players={[]}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
