import rangeWithPrefix from "../../utils/rangeWithPrefix";
import "./LiveGames.scss";

// Here rather than in `LiveGames`, so the skeleton never pulls in the page's chunk.
export const LIVE_TITLE = "Live";

const GAME_COUNT = 2;

/** A wireframe of the live games list, for while the week or the page loads. */
export default function LiveGamesSkeleton() {
  return (
    <div className="live-games --loading" aria-hidden="true">
      <div className="live-games__section">
        <span className="live-games__section-title">{LIVE_TITLE}</span>
        <div className="live-games__list">
          {rangeWithPrefix(GAME_COUNT, "G").map((game) => (
            <div key={game} className="live-games__game">
              <span className="live-games__skeleton-band" />
              <span className="live-games__skeleton-body">
                <span className="live-games__skeleton-bar --scoreline" />
                <span className="live-games__skeleton-bar --split" />
                <span className="live-games__skeleton-bar --meta" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
