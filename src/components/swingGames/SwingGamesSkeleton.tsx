import rangeWithPrefix from "../../utils/rangeWithPrefix";
import { RESULTS_PAGE } from "../results/resultsPath";
import SkeletonStatus from "../pageLayout/SkeletonStatus";
import { SWING_GAMES_INTRO } from "./swingGamesIntro";
import "./SwingGames.scss";

const GAME_COUNT = 3;
const PLAYER_COUNT = 4;

/** A wireframe of the swing games list, for while the week is worked out. */
export default function SwingGamesSkeleton() {
  return (
    <>
      <SkeletonStatus page={RESULTS_PAGE.swingGames} />
      <div className="swing-games --loading" aria-hidden="true" inert>
        <p className="swing-games__intro">{SWING_GAMES_INTRO}</p>
        {rangeWithPrefix(GAME_COUNT, "G").map((game) => (
          <div key={game} className="swing-games__group">
            <span className="swing-games__skeleton-band" />
            <div className="swing-games__side">
              <span className="swing-games__skeleton-bar --pick" />
              <div className="swing-games__players">
                {rangeWithPrefix(PLAYER_COUNT, "N").map((name) => (
                  <span
                    key={name}
                    className="swing-games__skeleton-bar --player"
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
