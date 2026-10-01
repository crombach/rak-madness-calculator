import { Accordion } from "@base-ui/react/accordion";
import rangeWithPrefix from "../../utils/rangeWithPrefix";
import { SwingGame } from "../../utils/scoring/swingGameTypes";
import SectionTitle from "../games/SectionTitle";
import { COMPLETED_TITLE } from "../games/sectionTitles";
import { STAND_IN, STAND_IN_RESULT } from "../games/standInGame";
import { RESULTS_PAGE } from "../results/resultsPath";
import SkeletonStatus from "../pageLayout/SkeletonStatus";
import SwingGameCard from "./SwingGameCard";
import "./SwingGames.scss";

// Two rows at the two-column width, enough to fill a tall screen, since a swing
// game stands taller than a scoreboard.
const STAND_IN_GAMES = 4;

/** Two rows of names, as many as a folded side shows at the narrowest width. */
const STAND_IN_PLAYERS = rangeWithPrefix(4, "Player ");

const STAND_IN_SWING: SwingGame = {
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
 * One section of stand-in swing games under a blank title, as `GamesSkeleton`
 * draws its own, for while the week or the page loads.
 */
export default function SwingGamesSkeleton() {
  const keys = rangeWithPrefix(STAND_IN_GAMES, "G");
  return (
    <>
      <SkeletonStatus page={RESULTS_PAGE.swingGames} />
      <Accordion.Root
        className="swing-games --loading"
        multiple
        value={keys}
        aria-hidden="true"
        inert
      >
        <div className="swing-games__section">
          <SectionTitle title={COMPLETED_TITLE} count={STAND_IN_GAMES} />
          <ul className="swing-games__list">
            {keys.map((key) => (
              <SwingGameCard
                key={key}
                game={{ ...STAND_IN_SWING, label: key }}
                weekGame={STAND_IN}
                status={STAND_IN_RESULT.status}
                knockedOut={NOBODY_OUT}
              />
            ))}
          </ul>
        </div>
      </Accordion.Root>
    </>
  );
}
