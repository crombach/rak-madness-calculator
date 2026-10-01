import { ReactNode, useMemo, useRef, useState } from "react";
import { useShowGameStatus } from "../../context/GameStatusContext";
import { useShowPlayerAnalysis } from "../../context/PlayerAnalysisContext";
import { isMyPlayer, useSettings } from "../../context/SettingsContext";
import { GameStatus } from "../../types/ESPN";
import { WeekGame } from "../../types/WeekGame";
import getClasses from "../../utils/getClasses";
import plural from "../../utils/plural";
import { Tiebreaker } from "../../types/RakMadnessScores";
import { SwingGame, SwingKnockout } from "../../utils/scoring/swingGameTypes";
import Button from "../button/Button";
import CountBadge from "../countBadge/CountBadge";
import GameMark, {
  PlayerCountMark,
  gameMarkLabel,
} from "../gameStatus/GameMark";
import PickBadge from "../pickBadge/PickBadge";
import useGridColumns from "./useGridColumns";
import "./SwingGames.scss";

const MUST_WIN = "must win";
const KNOCKED_OUT = "knocked out on";

/** Each tier as the Scoreboard heads its column. */
const TIEBREAKER_NAMES: Record<Tiebreaker, string> = {
  mnfPoints: "MNF Points",
  college: "College Score",
  proAgainstTheSpread: "Pro Score ATS",
};

/** What settled a knockout, with the player's MNF Points where those did. */
function knockoutNote({ tiebreaker, pick }: SwingKnockout): string {
  const name = TIEBREAKER_NAMES[tiebreaker];
  return pick == null ? name : `${name} ${pick}`;
}

/** How many rows of names a folded side shows. */
const FOLDED_ROWS = 2;

/** The columns `.swing-games__players` lays out at the narrowest supported width. */
const BASE_COLUMNS = 2;

/**
 * A side's players, the reader first so a fold never hides them. Each is ruled in
 * the tables' hue for whether they can still win, and one a tiebreaker knocked out
 * says which under their name.
 */
function Side({
  heading,
  players: ranked,
  tiebreakers,
  knockedOut,
}: {
  heading: ReactNode;
  players: Array<string>;
  tiebreakers?: Record<string, SwingKnockout>;
  knockedOut: ReadonlySet<string>;
}) {
  const showPlayerAnalysis = useShowPlayerAnalysis();
  const { playerName } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const players = useMemo(() => {
    const mine = ranked.filter((name) => isMyPlayer(name, playerName));
    return [...mine, ...ranked.filter((name) => !mine.includes(name))];
  }, [ranked, playerName]);
  const grid = useRef<HTMLUListElement>(null);
  const limit = FOLDED_ROWS * useGridColumns(grid, BASE_COLUMNS);
  const folded = players.length - limit;
  const shown = isExpanded ? players : players.slice(0, limit);

  return (
    <div className="swing-games__side">
      <h4 className="swing-games__must-win">
        <CountBadge>{ranked.length}</CountBadge> {heading}
      </h4>
      <ul ref={grid} className="swing-games__players">
        {shown.map((name) => {
          const knockout = tiebreakers?.[name];
          const note = knockout && knockoutNote(knockout);
          return (
            <li key={name}>
              <button
                type="button"
                className={getClasses("swing-games__player", {
                  "--mine": isMyPlayer(name, playerName),
                  "--knocked-out": knockedOut.has(name),
                })}
                aria-label={note && `${name}, ${KNOCKED_OUT} ${note}`}
                onClick={() => showPlayerAnalysis(name)}
              >
                <span className="swing-games__player-name">{name}</span>
                {note && (
                  <span className="swing-games__player-note">{note}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {folded > 0 && (
        <Button
          className="swing-games__more"
          variant="soft"
          size="sm"
          ariaExpanded={isExpanded}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Show Fewer" : "Show More"}
        </Button>
      )}
    </div>
  );
}

/** One swing game as a card: its band, then a side per team it knocks out. */
export default function SwingGameCard({
  game,
  weekGame,
  status,
  knockedOut,
}: {
  game: SwingGame;
  weekGame?: WeekGame;
  /** The freshest status known, which for a polled game is not the scoring pass's. */
  status?: GameStatus;
  knockedOut: ReadonlySet<string>;
}) {
  const showGameStatus = useShowGameStatus();
  const tiers = game.tiebreakers ?? [];
  const count = [...game.sides, ...tiers].reduce(
    (total, side) => total + side.players.length,
    0,
  );
  const players = plural(count, "player");
  const gameName = `${game.label} ${game.name}`;
  const markLabel = weekGame && gameMarkLabel(weekGame, status);

  return (
    <li className="swing-games__group">
      <h3 className="swing-games__title">
        {/* The whole band opens Game Status, as the picks table's own column
            heading does. The count and the mark sit at its end, where All Games
            has the mark. */}
        <button
          type="button"
          className="swing-games__game"
          aria-label={[`Game Status for ${gameName}`, players, markLabel]
            .filter((part) => part != null)
            .join(", ")}
          onClick={() => showGameStatus(game.label)}
        >
          <span className="swing-games__game-label">{game.label}</span>{" "}
          <span className="swing-games__game-matchup">{game.name}</span>
          <span className="swing-games__marks">
            <PlayerCountMark count={count} />
            {weekGame && <GameMark game={weekGame} status={status} />}
          </span>
        </button>
      </h3>
      <div className="swing-games__sides">
        {game.sides.map((side) => (
          <Side
            key={side.team}
            heading={
              <>
                {game.isFinal ? KNOCKED_OUT : MUST_WIN}{" "}
                <PickBadge
                  pick={side.pick}
                  outcome={game.isFinal ? "missed" : undefined}
                />
              </>
            }
            players={side.players}
            tiebreakers={side.tiebreakers}
            knockedOut={knockedOut}
          />
        ))}
        {tiers.map((tier) => (
          <Side
            key={tier.tiebreaker}
            heading={
              <>
                {KNOCKED_OUT} {TIEBREAKER_NAMES[tier.tiebreaker]}
                {tier.total != null && (
                  <>
                    {" "}
                    <span className="swing-games__total">{tier.total}</span>
                  </>
                )}
              </>
            }
            players={tier.players}
            tiebreakers={tier.tiebreakers}
            knockedOut={knockedOut}
          />
        ))}
      </div>
    </li>
  );
}
