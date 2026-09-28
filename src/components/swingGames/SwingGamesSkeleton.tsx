import rangeWithPrefix from "../../utils/rangeWithPrefix";
import "./SwingGames.scss";

const GAME_COUNT = 3;
const PLAYER_COUNT = 4;

/** A wireframe of the swing games list, for while the week is worked out. */
export default function SwingGamesSkeleton() {
  return (
    <div className="swing-games --loading" aria-hidden="true">
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
  );
}
