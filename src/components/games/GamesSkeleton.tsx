import { useSettings } from "../../context/SettingsContext";
import rangeWithPrefix from "../../utils/rangeWithPrefix";
import { RESULTS_PAGE } from "../results/resultsPath";
import SkeletonStatus from "../pageLayout/SkeletonStatus";
import GameCard from "./GameCard";
import SectionTitle from "./SectionTitle";
import { COMPLETED_TITLE } from "./sectionTitles";
import { STAND_IN, STAND_IN_PICK, STAND_IN_RESULT } from "./standInGame";
import "./Games.scss";

// Four rows at the two-column width, enough to fill a tall screen.
const STAND_IN_GAMES = 8;

/**
 * One section of stand-in cards under a blank title, for while the week or the
 * page loads. Blank because which sections the week has is not known yet, and a
 * title that changes when it lands reads as the week changing. A reader with a name
 * set gets their pick's line too, which the loaded cards will carry.
 */
export default function GamesSkeleton() {
  const { playerName } = useSettings();
  const myPick = playerName.trim() ? STAND_IN_PICK : undefined;
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
                myPick={myPick}
                players={[]}
              />
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
