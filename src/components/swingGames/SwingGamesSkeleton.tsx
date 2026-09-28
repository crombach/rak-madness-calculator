import rangeWithPrefix from "../../utils/rangeWithPrefix";
import "./SwingGames.scss";

const GAME_COUNT = 4;

/** A wireframe of the swing games list, for while the week is worked out. */
export default function SwingGamesSkeleton() {
  return (
    <div className="swing-games --loading" aria-hidden="true">
      {rangeWithPrefix(GAME_COUNT, "G").map((key) => (
        <div key={key} className="swing-games__skeleton-game">
          <span className="swing-games__skeleton-bar --title" />
          <span className="swing-games__skeleton-bar --pick" />
          <span className="swing-games__skeleton-bar --players" />
        </div>
      ))}
    </div>
  );
}
