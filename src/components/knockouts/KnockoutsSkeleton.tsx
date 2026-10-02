import rangeWithPrefix from "../../utils/rangeWithPrefix";
import { KnockoutGame } from "../../utils/scoring/knockoutTypes";
import SectionTitle from "../games/SectionTitle";
import { COMPLETED_TITLE } from "../games/sectionTitles";
import { STAND_IN, STAND_IN_RESULT } from "../games/standInGame";
import { RESULTS_PAGE } from "../results/resultsPath";
import SkeletonStatus from "../pageLayout/SkeletonStatus";
import KnockoutCard from "./KnockoutCard";
import "./Knockouts.scss";

// Enough to fill a tall screen, one game to a row.
const STAND_IN_GAMES = 8;

/** Two rows of names at the narrowest width, short of the fold. */
const STAND_IN_PLAYERS = rangeWithPrefix(4, "Player ");

const STAND_IN_GAME: KnockoutGame = {
  label: STAND_IN.label,
  name: STAND_IN.name,
  isFinal: false,
  sides: [
    { team: "AWY", pick: "AWY -3", players: STAND_IN_PLAYERS },
    { team: "HOM", pick: "HOM +3", players: STAND_IN_PLAYERS },
  ],
};

const NOBODY_OUT: ReadonlySet<string> = new Set();

/**
 * One section of stand-in knockout games under a blank title, as `GamesSkeleton`
 * draws its own, for while the week or the page loads.
 */
export default function KnockoutsSkeleton() {
  const keys = rangeWithPrefix(STAND_IN_GAMES, "G");
  return (
    <>
      <SkeletonStatus page={RESULTS_PAGE.knockouts} />
      <div className="knockouts --loading" aria-hidden="true" inert>
        <div className="knockouts__section">
          <SectionTitle title={COMPLETED_TITLE} count={STAND_IN_GAMES} />
          <ul className="knockouts__list">
            {keys.map((key) => (
              <KnockoutCard
                key={key}
                game={{ ...STAND_IN_GAME, label: key }}
                weekGame={STAND_IN}
                status={STAND_IN_RESULT.status}
                knockedOut={NOBODY_OUT}
              />
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
